// Firebase messaging service worker for push notifications
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js"
);

const firebaseConfig = {
  apiKey: "AIzaSyD50Lsmg3khTmYkGiu7LREqivXsBkePQMI",
  authDomain: "drainsentry.firebaseapp.com",
  databaseURL: "https://drainsentry-default-rtdb.firebaseio.com",
  projectId: "drainsentry",
  storageBucket: "drainsentry.firebasestorage.app",
  messagingSenderId: "610406293973",
  appId: "1:610406293973:web:e112664f4dbfd9d6dd1d5c",
  measurementId: "G-PF2451RX9Q",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("Received background message:", payload);

  const notificationTitle = payload.notification?.title || "DrainSentry Alert";
  const notificationOptions = {
    body: payload.notification?.body || "Critical alert detected",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: payload.data?.type || "general",
    data: payload.data,
    actions: [
      {
        action: "view",
        title: "View Details",
      },
      {
        action: "dismiss",
        title: "Dismiss",
      },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "view") {
    const urlToOpen = event.notification.data?.url || "/";
    event.waitUntil(
      clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clientList) => {
          // Check if there's already a window/tab open with the target URL
          for (const client of clientList) {
            if (client.url === urlToOpen && "focus" in client) {
              return client.focus();
            }
          }
          // If not, open a new window/tab
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});
