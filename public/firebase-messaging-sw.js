// This file is intentionally left blank. 
// It will be populated by the next-pwa plugin during the build process.
// We need this file to exist for the service worker registration to succeed in development.

// In a production build, next-pwa will inject the necessary Firebase Messaging SDK scripts
// and the configuration from your next.config.js `pwa` options.

// For background notifications to work, ensure your server-side code (e.g., in a Genkit flow)
// sends a payload that includes a `notification` object, like so:
/*
  await messaging.send({
    token: fcmToken,
    notification: {
      title: 'Judul Notifikasi Anda',
      body: 'Isi pesan notifikasi di sini.',
      icon: '/icons/icon-192x192.png',
    },
    webpush: {
      fcmOptions: {
        link: '/target-url' // URL to open when notification is clicked
      }
    }
  });
*/

// The click action is handled automatically by the Firebase Messaging SDK's default behavior
// when it receives a notification with an fcmOptions.link.
