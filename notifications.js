// notifications.js — FCM Push Notifications (natif Capacitor sur Android, web sinon)
const VAPID_KEY = "BLeLkb2REOdUmb9sDTjyKwetimQqbcgjWLFIeiqz-2soP0DVZF4HauFNge-nuU9H_mUcmZE8fvLAZyoSJi4LoVM";

const isCapacitor = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

// ---- MODE NATIF (Android Capacitor) ----
async function initNativePushNotifications() {
    try {
        const { PushNotifications } = window.Capacitor.Plugins;
        if (!PushNotifications) return;

        // Vérifie les permissions
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
        }
        if (permStatus.receive !== 'granted') {
            console.log('[FCM Native] Permission refusée');
            return;
        }

        // Enregistrement FCM
        await PushNotifications.register();

        // Réception du token FCM
        PushNotifications.addListener('registration', async (token) => {
            console.log('[FCM Native] Token:', token.value);
            if (token.value && currentUser) {
                await db.collection("users").doc(currentUser.uid).update({ fcmToken: token.value });
                console.log('[FCM Native] Token sauvegardé');
            }
        });

        // Erreur d'enregistrement
        PushNotifications.addListener('registrationError', (err) => {
            console.log('[FCM Native] Erreur enregistrement:', err);
        });

        // Notification reçue quand app ouverte
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('[FCM Native] Notification reçue:', notification);
            showToast((notification.title || '') + (notification.body ? ' — ' + notification.body : ''));
        });

        // Tap sur notification (app fermée ou en arrière-plan)
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            console.log('[FCM Native] Notification tappée:', action);
        });

    } catch (e) {
        console.log('[FCM Native] Erreur init:', e);
    }
}

// ---- MODE WEB (navigateur) ----
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

// ---- POINT D'ENTRÉE ----
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
            console.log("[FCM Web] Token sauvegardé");
        }
    } catch(e) { console.log("[FCM Web] token error:", e); }
}
