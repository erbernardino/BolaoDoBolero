importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyDvMAPPuXF_qYRnmnz0Y4R6JlZJFFQ_tao',
  projectId: 'bolao-do-bolero',
  messagingSenderId: '255856520312',
  appId: '1:255856520312:web:638abbe7ed4ee8ecabd18d',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {}
  self.registration.showNotification(title || 'Bolão do Bolero', {
    body,
    icon: '/icon-192.png',
  })
})
