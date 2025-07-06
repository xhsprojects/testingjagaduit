
// DO NOT MODIFY - This file is dynamically generated
// Use compat libraries for service worker for broadest compatibility
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// Import the configuration from our dynamic API route
// This defines `self.firebaseConfig`
try {
  importScripts('/api/firebase-config');
} catch (e) {
  console.error('Failed to import firebase config.', e);
}


if (self.firebaseConfig && self.firebaseConfig.apiKey) {
  // Initialize the Firebase app in the service worker
  if (!firebase.apps.length) {
      firebase.initializeApp(self.firebaseConfig);
      console.log('Firebase messaging SW initialized');
  }

  // Retrieve an instance of Firebase Messaging so that it can handle background messages.
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: '/icons/icon-192x192.png',
      // Extract link from data payload if it exists, otherwise default to root
      data: {
        url: payload.fcmOptions?.link || payload.data?.link || '/'
      }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} else {
    console.error("Firebase config not found or incomplete in service worker. Background notifications will not work.");
}

// This listener handles the user clicking on the notification
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.', event.notification);

  event.notification.close();

  // This looks for an open window/tab with the app's origin and focuses it.
  // If not found, it opens a new one to the URL specified in the notification data.
  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  event.waitUntil(clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((clientList) => {
    for (let i = 0; i < clientList.length; i++) {
      const client = clientList[i];
      if (client.url === urlToOpen && 'focus' in client) {
        return client.focus();
      }
    }
    if (clients.openWindow) {
      return clients.openWindow(urlToOpen);
    }
  }));
});
