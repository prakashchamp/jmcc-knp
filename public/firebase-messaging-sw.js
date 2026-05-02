importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyASHS_A9yezi98w9TId5NnwyncUXmgZt_w",
  authDomain: "jmcc-spartans.firebaseapp.com",
  projectId: "jmcc-spartans",
  storageBucket: "jmcc-spartans.appspot.com",
  messagingSenderId: "605062830647",
  appId: "1:605062830647:web:1edaa51eb4040a7dfdfdb2",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/jmcc.jpg',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);

  // If it's a match update, broadcast to clients to refresh data
  if (payload.data && payload.data.type === 'MATCH_UPDATE') {
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'MATCH_UPDATE',
          payload: payload.data
        });
      });
    });
  }
});
