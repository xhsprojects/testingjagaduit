// public/firebase-messaging-sw.js

// This file must be in the public directory. It is imported by the main service worker.

// Import the Firebase SDK for its side effects.
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// Initialize the Firebase app in the service worker.
// The messagingSenderId is the only required value for background notifications.
if (self.firebase && !self.firebase.apps.length) {
    console.log("Initializing Firebase in Service Worker...");
    self.firebase.initializeApp({
        // This is a public value, safe to be here.
        // It is required for the service worker to identify the Firebase project.
        messagingSenderId: "951559463991",
    });
    
    // Retrieve an instance of Firebase Messaging so that it can handle background messages.
    const messaging = self.firebase.messaging();
    
    messaging.onBackgroundMessage((payload) => {
        console.log(
            "[firebase-messaging-sw.js] Received background message ",
            payload
        );

        // Customize notification here from the data payload if available
        const notificationTitle = payload.notification?.title || "Notifikasi Baru";
        const notificationOptions = {
            body: payload.notification?.body || "Anda memiliki pesan baru.",
            icon: payload.notification?.icon || "/icons/icon-192x192.png",
            data: {
                url: payload.fcmOptions?.link || '/',
            },
        };
        
        self.registration.showNotification(notificationTitle, notificationOptions);
    });

    self.addEventListener('notificationclick', (event) => {
        event.notification.close();
        const urlToOpen = event.notification.data.url || '/';
        event.waitUntil(
            clients.matchAll({
                type: 'window',
                includeUncontrolled: true
            }).then((clientList) => {
                if (clientList.length > 0) {
                    let client = clientList[0];
                    for (let i = 0; i < clientList.length; i++) {
                        if (clientList[i].focused) {
                            client = clientList[i];
                        }
                    }
                    return client.focus().then(c => c.navigate(urlToOpen));
                }
                return clients.openWindow(urlToOpen);
            })
        );
    });

} else {
    console.log("Firebase already initialized in Service Worker or firebase-app-compat.js not loaded.");
}
