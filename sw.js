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
            icon: 'https://cdn-icons-png.flaticon.com/512/906/906334.png',
            vibrate: [200, 100, 200], // Fait vibrer le téléphone !
            badge: 'https://cdn-icons-png.flaticon.com/512/906/906334.png'
        });
    }
});
