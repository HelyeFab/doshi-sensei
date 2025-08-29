// Firebase Messaging Service Worker
// This file must be in the public folder and served from the root

importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Your Firebase config - must match the config in your app
const firebaseConfig = {
  apiKey: "AIzaSyCwwtWvfT6ws9rDyWGeH-RVWoTQtK-k_eI",
  authDomain: "doshi-sensei.firebaseapp.com",
  projectId: "doshi-sensei",
  storageBucket: "doshi-sensei.firebasestorage.app",
  messagingSenderId: "940013577006",
  appId: "1:940013577006:web:7fb9e708bd1c99c41a50bf",
  measurementId: "G-X6LK9BFMEV"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Customize notification here
  const notificationTitle = payload.notification?.title || 'Doshi Sensei';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: payload.data?.tag || 'notification',
    data: payload.data,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click: ', event.notification.tag);
  
  event.notification.close();

  // Handle action clicks
  if (event.action === 'dismiss') {
    return;
  }

  // Open the app or focus it if already open
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const hadWindowToFocus = clientList.some((client) => {
        if (client.url === '/' && 'focus' in client) {
          client.focus();
          return true;
        }
        return false;
      });

      if (!hadWindowToFocus) {
        const urlToOpen = event.notification.data?.path || '/';
        return clients.openWindow(urlToOpen);
      }
    })
  );
});