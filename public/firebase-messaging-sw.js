
// public/firebase-messaging-sw.js

// Make sure to use the same version as your 'firebase' package
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// A placeholder config. The client will send the actual config.
const firebaseConfig = {};

// Wait for the config from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_FIREBASE_CONFIG') {
    if (!firebase.apps.length) {
      console.log('[SW] Firebase config received. Initializing app.');
      firebase.initializeApp(event.data.config);
      
      const messaging = firebase.messaging();
      console.log('[SW] Firebase Messaging initialized for background messages.');
      
      messaging.onBackgroundMessage((payload) => {
        console.log('[SW] Received background message. FCM will handle display.', payload);
        // This handler is for data-only messages. 
        // If the payload has a 'notification' field, FCM shows it automatically.
      });
    }
  }
});


self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click Received.', event.notification);
  event.notification.close();

  // The 'data' object is where fcmOptions.link ends up.
  const notificationUrl = event.notification.data?.link || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientsArr) => {
      // Check if a window with the same URL is already open.
      const clientToFocus = clientsArr.find(
          (windowClient) => new URL(windowClient.url).pathname === new URL(notificationUrl, self.location.origin).pathname
      );

      if (clientToFocus) {
          return clientToFocus.focus();
      }
      
      // If not, open a new one.
      return clients.openWindow(notificationUrl);
    })
  );
});
