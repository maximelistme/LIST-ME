// notifications.js — FCM Push Notifications
const VAPID_KEY = "BLeLkb2REOdUmb9sDTjyKwetimQqbcgjWLFIeiqz-2soP0DVZF4HauFNge-nuU9H_mUcmZE8fvLAZyoSJi4LoVM";

let messaging = null;

try {
    if (typeof firebase !== 'undefined' && firebase.messaging && firebase.messaging.isSupported()) {
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
} catch(e) { console.log("FCM init skipped:", e); }

async function requestNotificationPermission() {
    if (!messaging) return;
    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
        const token = await messaging.getToken({ vapidKey: VAPID_KEY });
        if (token && currentUser) {
            await db.collection("users").doc(currentUser.uid).update({ fcmToken: token });
        }
    } catch(e) { console.log("FCM token error:", e); }
}
