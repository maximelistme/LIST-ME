// sw.js - Notifications locales + Push FCM background
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyAVkf6PEZnPWLrS1smnau0J6k3ZE1wGX-4",
    authDomain: "listme-2620d.firebaseapp.com",
    projectId: "listme-2620d",
    storageBucket: "listme-2620d.firebasestorage.app",
    messagingSenderId: "145966801688",
    appId: "1:145966801688:web:34638000fbafaff5bd346d"
});

const messaging = firebase.messaging();

// Notifications push reçues en arrière-plan (app fermée)
messaging.onBackgroundMessage((payload) => {
    const { title, body } = payload.notification;
    self.registration.showNotification(title, {
        body: body,
        icon: '/LIST-ME/icons/icon-192.png',
        badge: '/LIST-ME/icons/icon-192.png',
        vibrate: [200, 100, 200],
        data: payload.data || {}
    });
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Notifications locales (app ouverte)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        self.registration.showNotification(event.data.title, {
            body: event.data.body,
            icon: '/LIST-ME/icons/icon-192.png',
            badge: '/LIST-ME/icons/icon-192.png',
            vibrate: [200, 100, 200]
        });
    }
});
