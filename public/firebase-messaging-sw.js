// public/firebase-messaging-sw.js

// Memberi nama pada service worker untuk kemudahan debugging
self.name = 'jaga-duit-sw';

// Mengimpor skrip Firebase dari CDN Google
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Mengambil konfigurasi Firebase dari API route yang sudah kita buat
// Ini memastikan service worker mendapatkan konfigurasi terbaru saat diaktifkan
const getConfigPromise = fetch('/api/firebase-config')
    .then(response => response.text())
    .then(scriptText => {
        // Menjalankan skrip konfigurasi di dalam scope service worker
        self.eval(scriptText);
        // `self.firebaseConfig` sekarang seharusnya sudah tersedia
        if (!self.firebaseConfig) {
            throw new Error("Konfigurasi Firebase tidak ditemukan setelah fetch.");
        }
        return self.firebaseConfig;
    });

// Menginisialisasi aplikasi Firebase setelah konfigurasi berhasil didapatkan
const appPromise = getConfigPromise.then(config => {
    console.log("Service Worker: Konfigurasi Firebase diterima, inisialisasi aplikasi...");
    return firebase.initializeApp(config);
}).catch(err => {
    console.error("Service Worker: Gagal mendapatkan atau menginisialisasi Firebase App.", err);
    // Jika gagal, kita tidak bisa melanjutkan
    return null;
});

// Menangani pesan yang diterima saat aplikasi di latar belakang
appPromise.then(app => {
    if (!app) {
        console.error("Service Worker: Inisialisasi Firebase gagal, handler pesan tidak akan diatur.");
        return;
    }
    const messaging = firebase.messaging(app);
    messaging.onBackgroundMessage((payload) => {
        console.log('[firebase-messaging-sw.js] Pesan diterima di latar belakang:', payload);

        const notificationTitle = payload.notification?.title || 'Notifikasi Baru';
        const notificationOptions = {
            body: payload.notification?.body || '',
            icon: payload.notification?.icon || '/icons/icon-192x192.png',
            data: payload.data || { link: '/' }
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
    });
});


// Menangani klik pada notifikasi
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notifikasi diklik:', event.notification);
    
    event.notification.close();

    const link = event.notification.data?.link || '/';
    
    event.waitUntil(
        clients.matchAll({ type: "window" }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === link && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(link);
            }
        })
    );
});
