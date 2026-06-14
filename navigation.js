// notifications.js — FCM Push Notifications
// VAPID_KEY à récupérer dans Firebase Console > Project Settings > Cloud Messaging
const VAPID_KEY = "BLeLkb2REOdUmb9sDTjyKwetimQqbcgjWLFIeiqz-2soP0DVZF4HauFNge-nuU9H_mUcmZE8fvLAZyoSJi4LoVM";

let messaging = null;

function initFCM() {
    if (!firebase.messaging.isSupported()) return;
    try {
        messaging = firebase.messaging();
    } catch(e) { return; }
}

async function requestNotificationPermission() {
    if (!messaging) return;
    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
        const token = await messaging.getToken({ vapidKey: VAPID_KEY });
        if (token && currentUser) {
            await db.collection("users").doc(currentUser.uid).update({ fcmToken: token });
        }
    } catch(e) {
        console.log("FCM token error:", e);
    }
}

// Notifications reçues quand l'app est ouverte
function startFCMListener() {
    if (!messaging) return;
    messaging.onMessage((payload) => {
        const { title, body } = payload.notification;
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'SHOW_NOTIFICATION', title, body
            });
        } else {
            new Notification(title, { body, icon: '/LIST-ME/icons/icon-192.png' });
        }
    });
}

initFCM();
