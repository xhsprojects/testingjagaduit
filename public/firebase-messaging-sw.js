
// Give the service worker a name
self.name = 'firebase-messaging-sw';

// Import the Firebase scripts for the compat libraries
try {
    importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
    importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");
} catch (e) {
    console.error("Failed to import Firebase scripts in Service Worker:", e);
}

// This message listener will be triggered when the service worker receives a message
// It should contain the firebase config from the client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SET_FIREBASE_CONFIG' && self.firebase) {
        // Check if Firebase is already initialized
        if (self.firebase.apps.length > 0) {
            return;
        }

        try {
            // Initialize Firebase
            const app = self.firebase.initializeApp(event.data.config);
            const messaging = self.firebase.messaging(app);
            console.log('Firebase messaging service worker is active with config:', event.data.config);
            
            // Set up the background message handler
            messaging.onBackgroundMessage((payload) => {
                console.log('[firebase-messaging-sw.js] Received background message: ', payload);
                
                if (!payload.notification) {
                    return;
                }
                
                const notificationTitle = payload.notification.title || 'Jaga Duit';
                const notificationOptions = {
                    body: payload.notification.body || 'Anda memiliki pemberitahuan baru.',
                    icon: payload.notification.icon || '/icons/icon-192x192.png',
                    // Use the webpush fcm_options.link if available, otherwise default to root
                    data: {
                        url: payload.fcmOptions?.link || '/'
                    }
                };

                self.registration.showNotification(notificationTitle, notificationOptions);
            });
        } catch (e) {
            console.error("Error initializing Firebase in service worker:", e);
        }
    }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification click received.', event.notification);
    event.notification.close();
    
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({
            type: "window",
            includeUncontrolled: true
        }).then((clientList) => {
            // If a window for the app is already open, focus it
            for (const client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise, open a new window
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});
