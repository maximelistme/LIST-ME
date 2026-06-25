importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyAVkf6PEZnPWLrS1smnau0J6k3ZE1wGX-4",
    authDomain: "listme-2620d.firebaseapp.com",
    projectId: "listme-2620d",
    storageBucket: "listme-2620d.firebasestorage.app",
    messagingSenderId: "145966801688",
    appId: "1:145966801688:web:34638000fbafaff5bd346d"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
    const { title, body } = payload.notification || {};
    if (title) {
        self.registration.showNotification(title, {
            body: body || '',
            icon: '/LIST-ME/icons/icon-192.png'
        });
    }
});
