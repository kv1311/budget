import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// Import global styles
import './styles/animations.css'

import { Capacitor } from '@capacitor/core'
import { Filesystem } from '@capacitor/filesystem'
import { LocalNotifications } from '@capacitor/local-notifications'
import { checkAndRequestPermissions } from './utils/permissions'

// Check permissions on app start
if (Capacitor.isNativePlatform()) {
  checkAndRequestPermissions().then(granted => {
    if (!granted) {
      console.error('Storage permissions not granted')
    }
  })
}

// Register the plugin
if (Capacitor.isNativePlatform()) {
  // Initialize Filesystem
  Filesystem

  // Initialize LocalNotifications
  LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
    const { actionId, notification: { extra } } = notification
    
    if (actionId === 'pay') {
      // Handle the payment action
      router.push('/settings/reminders')
    } else if (actionId === 'later') {
      console.log('Notification rescheduled')
    }
  })
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
