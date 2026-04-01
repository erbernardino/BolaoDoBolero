importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'placeholder',
  projectId: 'placeholder',
  messagingSenderId: 'placeholder',
  appId: 'placeholder',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {}
  self.registration.showNotification(title || 'Bolão do Bolero', {
    body,
    icon: '/icon-192.png',
  })
})
