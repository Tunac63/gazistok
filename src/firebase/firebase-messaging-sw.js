// [Firebase Messaging Service Worker]
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAKfvYLMvgvjEm70cTsv0hGu1Ut_2fZIU8",
  authDomain: "gazistok.firebaseapp.com",
  projectId: "gazistok",
  storageBucket: "gazistok.firebasestorage.app",
  messagingSenderId: "1003165730366",
  appId: "1:1003165730366:web:8d2314c04ddb69bcd7336f"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/logo192.png',
  });
});
