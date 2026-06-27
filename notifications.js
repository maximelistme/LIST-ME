// notifications.js — Notifications natives (Capacitor) + web fallback
const VAPID_KEY = "BLeLkb2REOdUmb9sDTjyKwetimQqbcgjWLFIeiqz-2soP0DVZF4HauFNge-nuU9H_mUcmZE8fvLAZyoSJi4LoVM";

const isCapacitor = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

// ============================================================
// MODE NATIF — Push token FCM + Notifications locales
// ============================================================

async function initNativePushNotifications() {
    try {
        const { PushNotifications } = window.Capacitor?.Plugins || {};
        if (!PushNotifications) return;

        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
            permStatus = await PushNotifications.requestPermissions();
        }
        if (permStatus.receive !== 'granted') return;

        await PushNotifications.register();

        PushNotifications.addListener('registration', async (token) => {
            if (token.value && currentUser) {
                await db.collection("users").doc(currentUser.uid).update({ fcmToken: token.value });
            }
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            showToast((notification.title || '') + (notification.body ? ' — ' + notification.body : ''));
        });

    } catch (e) {
        console.log('[FCM Native] Erreur:', e);
    }
}

// ============================================================
// NOTIFICATIONS LOCALES — programmées à l'avance
// ============================================================

async function scheduleLocalNotifications() {
    if (!isCapacitor) return;
    const { LocalNotifications } = window.Capacitor?.Plugins || {};
    if (!LocalNotifications) return;

    try {
        // Vérifier/demander permission
        let perm = await LocalNotifications.checkPermissions();
        if (perm.display === 'prompt') {
            perm = await LocalNotifications.requestPermissions();
        }
        if (perm.display !== 'granted') return;

        // Annuler toutes les notifications en attente
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
            await LocalNotifications.cancel({ notifications: pending.notifications });
        }

        const now = new Date();
        const notifications = [];
        let idCounter = 1;

        // ---- TÂCHES (propres + partagées) ----
        const allTasks = [...(tasks || []), ...(sharedTasks || [])];
        allTasks.forEach(t => {
            if (t.completed || !t.date) return;

            // Construire toutes les occurrences (tâche principale + duplicates)
            let occurrences = [];
            if (t.time) occurrences.push({ date: t.date, time: t.time });
            if (t.duplicateDays && t.duplicateDays.length > 0) {
                t.duplicateDays.forEach(g => {
                    const occ = typeof g === 'string' ? { date: g, time: t.time } : g;
                    if (occ.date && occ.time) occurrences.push(occ);
                });
            }

            occurrences.forEach(occ => {
                const [h, m] = occ.time.split(':').map(Number);
                const taskDate = new Date(occ.date + 'T00:00:00');
                taskDate.setHours(h, m, 0, 0);

                // Rappels personnalisés (X minutes avant)
                if (t.reminders && t.reminders.length > 0) {
                    t.reminders.forEach(r => {
                        const at = new Date(taskDate.getTime() - Number(r) * 60000);
                        if (at > now) {
                            notifications.push({
                                id: idCounter++,
                                title: `🔔 Rappel : ${t.name}`,
                                body: Number(r) === 0 ? "C'est maintenant !" : `Commence dans ${r} minutes.`,
                                schedule: { at },
                                sound: 'default',
                                channelId: 'listme-reminders'
                            });
                        }
                    });
                }

                // Rappel veille à 20h
                const veille = new Date(taskDate);
                veille.setDate(veille.getDate() - 1);
                veille.setHours(20, 0, 0, 0);
                if (veille > now) {
                    notifications.push({
                        id: idCounter++,
                        title: `⏰ Rappel : C'est pour demain !`,
                        body: `Ne pas oublier : "${t.name}" prévu demain.`,
                        schedule: { at: veille },
                        sound: 'default',
                        channelId: 'listme-reminders'
                    });
                }
            });
        });

        // ---- ANNIVERSAIRES (30 prochains jours) ----
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        (birthdays || []).forEach(b => {
            if (!b.date) return;
            const parts = b.date.split('-');
            const month = parts[1], day = parts[2];

            [now.getFullYear(), now.getFullYear() + 1].forEach(year => {
                const bdayAt = new Date(`${year}-${month}-${day}T09:00:00`);
                if (bdayAt > now && bdayAt <= in30Days) {
                    notifications.push({
                        id: idCounter++,
                        title: `🎂 Joyeux Anniversaire !`,
                        body: `C'est l'anniversaire de ${b.name} aujourd'hui !`,
                        schedule: { at: bdayAt },
                        sound: 'default',
                        channelId: 'listme-reminders'
                    });
                    const veilleB = new Date(bdayAt.getTime() - 24 * 60 * 60 * 1000);
                    veilleB.setHours(9, 0, 0, 0);
                    if (veilleB > now) {
                        notifications.push({
                            id: idCounter++,
                            title: `🎁 Bientôt un anniversaire`,
                            body: `C'est l'anniversaire de ${b.name} demain !`,
                            schedule: { at: veilleB },
                            sound: 'default',
                            channelId: 'listme-reminders'
                        });
                    }
                }
            });
        });

        // Programmer toutes les notifications
        if (notifications.length > 0) {
            await LocalNotifications.schedule({ notifications });
            console.log(`[LocalNotif] ${notifications.length} notifications programmées`);
        }

    } catch (e) {
        console.log('[LocalNotif] Erreur:', e);
    }
}

// ============================================================
// MODE WEB — Firebase Messaging
// ============================================================

let messaging = null;
if (!isCapacitor) {
    try {
        const supported = firebase.messaging && firebase.messaging.isSupported();
        if (supported) {
            messaging = firebase.messaging();
            messaging.onMessage((payload) => {
                try {
                    const { title, body } = payload.notification;
                    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                        navigator.serviceWorker.controller.postMessage({ type: 'SHOW_NOTIFICATION', title, body });
                    }
                } catch(e) {}
            });
        }
    } catch(e) { console.log("[FCM Web] init error:", e); }
}

// ============================================================
// POINT D'ENTRÉE
// ============================================================

async function requestNotificationPermission() {
    if (isCapacitor) {
        await initNativePushNotifications();
        return;
    }
    // Fallback web
    if (!messaging) return;
    try {
        if (Notification.permission === 'denied') return;
        if (Notification.permission !== 'granted') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return;
        }
        const token = await messaging.getToken({ vapidKey: VAPID_KEY });
        if (token && currentUser) {
            await db.collection("users").doc(currentUser.uid).update({ fcmToken: token });
        }
    } catch(e) { console.log("[FCM Web] token error:", e); }
}
