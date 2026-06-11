// sw.js - Version optimisée pour notifications mobiles locales
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force la mise à jour immédiate
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim()); // Prend le contrôle de la page immédiatement
});

// Écouteur pour les notifications locales renforcées
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        self.registration.showNotification(event.data.title, {
            body: event.data.body,
            icon: '/LIST-ME/icons/icon-192.png',
            vibrate: [200, 100, 200],
            badge: '/LIST-ME/icons/icon-192.png'
        });
    }
});
