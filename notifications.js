// notifications.js — FCM Push Notifications
const VAPID_KEY = "BLeLkb2REOdUmb9sDTjyKwetimQqbcgjWLFIeiqz-2soP0DVZF4HauFNge-nuU9H_mUcmZE8fvLAZyoSJi4LoVM";

let messaging = null;

try {
    const supported = firebase.messaging && firebase.messaging.isSupported();
    console.log("[FCM] isSupported:", supported);
    if (supported) {
        messaging = firebase.messaging();
        console.log("[FCM] messaging initialisé");
        messaging.onMessage((payload) => {
            try {
                const { title, body } = payload.notification;
                if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({ type: 'SHOW_NOTIFICATION', title, body });
                }
            } catch(e) {}
        });
    }
} catch(e) { console.log("[FCM] init error:", e); }

async function requestNotificationPermission() {
    console.log("[FCM] requestNotificationPermission appelé, messaging=", messaging);
    if (!messaging) { console.log("[FCM] messaging null, abandon"); return; }
    try {
        const permission = await Notification.requestPermission();
        console.log("[FCM] permission:", permission);
        if (permission !== 'granted') return;
        const token = await messaging.getToken({ vapidKey: VAPID_KEY });
        console.log("[FCM] token:", token);
        if (token && currentUser) {
            await db.collection("users").doc(currentUser.uid).update({ fcmToken: token });
            console.log("[FCM] token sauvegardé !");
        }
    } catch(e) { console.log("[FCM] token error:", e); }
}
