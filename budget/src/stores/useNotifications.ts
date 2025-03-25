import { ref } from 'vue'
import { defineStore } from 'pinia'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'
import { selectedCurrency } from './useStore'

// Add WindowClient interface
interface WindowClient {
  postMessage(message: any): void;
}

declare global {
  interface Window {
    clients: {
      matchAll(): Promise<WindowClient[]>;
    }
  }
}

export const useNotifications = defineStore('notifications', () => {
  const hasPermission = ref(false)

  // Add channel initialization
  const initializeNotificationChannel = async () => {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      try {
        await LocalNotifications.createChannel({
          id: 'reminders',
          name: 'Reminders',
          importance: 4, // HIGH
          description: 'Reminder notifications for upcoming payments',
          visibility: 1,
          vibration: true,
          lights: true,
          sound: 'default'
        })
        console.log('Notification channel created successfully')
      } catch (error) {
        console.error('Failed to create notification channel:', error)
      }
    }
  }

  const requestPermission = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        // Initialize channel before checking permissions
        await initializeNotificationChannel()
        
        const { display } = await LocalNotifications.checkPermissions()
        if (display === 'prompt') {
          const { display: newPermission } = await LocalNotifications.requestPermissions()
          hasPermission.value = newPermission === 'granted'
        } else {
          hasPermission.value = display === 'granted'
        }
        
        // Register action types after getting permission
        if (hasPermission.value) {
          await LocalNotifications.registerActionTypes({
            types: [{
              id: 'REMINDER_ACTION',
              actions: [
                { id: 'pay', title: 'Paid' },
                { id: 'later', title: 'Remind Later' }
              ]
            }]
          })
        }
      } catch (error) {
        console.error('Error requesting permissions:', error)
        hasPermission.value = false
      }
    } else if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      hasPermission.value = permission === 'granted'
    }
    return hasPermission.value
  }

  const scheduleReminderNotifications = async (reminder: any) => {
    if (!hasPermission.value) {
      const granted = await requestPermission()
      if (!granted) return
    }

    const dueDate = new Date(reminder.datetime)
    
    if (dueDate.getTime() <= Date.now()) return

    if (Capacitor.isNativePlatform()) {
      try {
        // Initialize Android notification channel
        if (Capacitor.getPlatform() === 'android') {
          await LocalNotifications.createChannel({
            id: 'reminders',
            name: 'Reminders',
            importance: 4,
            visibility: 1,
            vibration: true,
            lights: true
          })
        }

        await LocalNotifications.schedule({
          notifications: [{
            title: `${reminder.description}`,
            body: `${selectedCurrency.value.symbol}${reminder.amount.toFixed(2)} to be paid from ${reminder.account}`,
            id: reminder.id,
            schedule: { at: dueDate },
            actionTypeId: 'REMINDER_ACTION',
            smallIcon: 'ic_stat_notifications',
            extra: {
              reminderId: reminder.id,
              isDueDate: true,
              type: 'reminder'
            }
          }]
        })

        // Verify scheduled notifications
        const pending = await LocalNotifications.getPending()
        console.log('Pending notifications:', pending)
      } catch (error) {
        console.error('Failed to schedule notifications:', error)
      }
    } else {
      // Web notification
      if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        const webNotification = {
          title: `${reminder.description} - Due Today!`,
          body: `${selectedCurrency.value.symbol}${reminder.amount.toFixed(2)} to be paid from ${reminder.account}`,
          icon: '/icon.png',
          tag: 'reminder',
          renotify: true,
          requireInteraction: true,
          data: {
            reminderId: reminder.id,
            isDueDate: true,
            title: reminder.description,
            reminder: reminder,
            options: {
              body: `${reminder.description} - Due Today!`,
              icon: '/icon.png'
            }
          }
        }

        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(reminder.description, webNotification)
        })
      }
    }
  }

  const scheduleNotification = (title: string, options: any, date: Date) => {
    const timerId = setTimeout(() => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, options)
        })
      }
    }, date.getTime() - Date.now())

    return timerId
  }

  const testNotification = async () => {
    if (!hasPermission.value) {
      await requestPermission()
    }

    const testReminder = {
      id: 'test-123',
      description: 'Netflix Subscription',
      amount: 14.99,
      datetime: new Date(Date.now() + 5000).toISOString(),
      frequency: 'monthly',
      category: 'entertainment',
      account: 'main'
    }

    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.registerActionTypes({
        types: [
          {
            id: 'REMINDER_ACTION',
            actions: [
              {
                id: 'pay',
                title: 'Paid'
              },
              {
                id: 'later',
                title: 'Remind Later'
              }
            ]
          }
        ]
      })

      await LocalNotifications.schedule({
        notifications: [
          {
            title: `${testReminder.description} - Due Today!`,
            body: `${selectedCurrency.value.symbol}${testReminder.amount.toFixed(2)} to be paid from ${testReminder.account}`,
            id: 999,
            schedule: { at: new Date(Date.now() + 5000) },
            actionTypeId: 'REMINDER_ACTION',
            extra: {
              reminderId: testReminder.id,
              isDueDate: true,
              type: 'test'
            }
          }
        ]
      })

      // Use platform specific notification channels instead
      if (Capacitor.getPlatform() === 'android') {
        await LocalNotifications.createChannel({
          id: 'reminders',
          name: 'Reminders',
          importance: 4,
          visibility: 1,
          vibration: true,
          lights: true
        })
      }

    } else {
      // Web notification
      if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        const webNotification = {
          title: `${testReminder.description} - Due Today!`,
          body: `${selectedCurrency.value.symbol}${testReminder.amount.toFixed(2)} to be paid from ${testReminder.account}`,
          icon: '/icon.png',
          tag: 'reminder',
          renotify: true,
          requireInteraction: true,
          data: {
            reminderId: testReminder.id,
            isDueDate: true,
            type: 'test',
            title: testReminder.description,
            reminder: testReminder,
            options: {
              body: `${testReminder.description} - Due Today!`,
              icon: '/icon.png'
            }
          }
        }

        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(testReminder.description, webNotification)
        })
      }
    }
  }

  // Add notification action listener
  if (Capacitor.isNativePlatform()) {
    LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
      const { actionId, notification } = notificationAction
      
      if (actionId === 'pay') {
        // Handle payment action
        handlePayment(notification.extra?.reminderId)
      } else if (actionId === 'later') {
        // Reschedule notification for 2 hours later
        const newTime = new Date(Date.now() + (2 * 60 * 60 * 1000))
        scheduleReminderNotifications({
          ...notification.extra,
          datetime: newTime.toISOString()
        })
      }
    })
  }

  const handlePayment = async (reminderId: string) => {
    if ('serviceWorker' in navigator) {
      try {
        const allClients = await (window as Window).clients.matchAll()
        allClients.forEach((client: WindowClient) => {
          client.postMessage({
            type: 'pay-reminder',
            reminderId: reminderId
          })
        })
      } catch (error) {
        console.error('Failed to handle payment:', error)
      }
    }
  }

  // Add this for debugging
  const checkScheduledNotifications = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const pending = await LocalNotifications.getPending()
        console.log('Pending notifications:', pending)
      } catch (error) {
        console.error('Failed to check notifications:', error)
      }
    }
  }

  return {
    hasPermission,
    requestPermission,
    scheduleReminderNotifications,
    testNotification,
    checkScheduledNotifications // Add this
  }
})
