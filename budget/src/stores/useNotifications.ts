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

  const requestPermission = async () => {
    if (Capacitor.isNativePlatform()) {
      const { display } = await LocalNotifications.checkPermissions()
      if (display === 'prompt') {
        const { display: newPermission } = await LocalNotifications.requestPermissions()
        hasPermission.value = newPermission === 'granted'
      } else {
        hasPermission.value = display === 'granted'
      }
    } else if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      hasPermission.value = permission === 'granted'
    }
    return hasPermission.value
  }

  const scheduleReminderNotifications = async (reminder: any) => {
    if (!hasPermission.value) return

    const dueDate = new Date(reminder.datetime)
    const twoDaysBefore = new Date(dueDate)
    twoDaysBefore.setDate(dueDate.getDate() - 2)
    
    const oneDayBefore = new Date(dueDate)
    oneDayBefore.setDate(dueDate.getDate() - 1)

    if (Capacitor.isNativePlatform()) {
      // Register action types first
      await LocalNotifications.registerActionTypes({
        types: [
          {
            id: 'REMINDER_ACTION',
            actions: [
              {
                id: 'pay',
                title: 'Paid ✓'
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
            title: reminder.description,
            body: `Due in 2 days - ${selectedCurrency.value.symbol}${reminder.amount.toFixed(2)}`,
            id: reminder.id + 2,
            schedule: { at: twoDaysBefore },
            actionTypeId: 'REMINDER_ACTION',
            extra: {
              reminderId: reminder.id,
              isDueDate: false
            }
          },
          {
            title: reminder.description,
            body: `Due tomorrow - ${selectedCurrency.value.symbol}${reminder.amount.toFixed(2)}`,
            id: reminder.id + 1,
            schedule: { at: oneDayBefore },
            actionTypeId: 'REMINDER_ACTION',
            extra: {
              reminderId: reminder.id,
              isDueDate: false
            }
          },
          {
            title: reminder.description,
            body: `Due today! - ${selectedCurrency.value.symbol}${reminder.amount.toFixed(2)}`,
            id: reminder.id,
            schedule: { at: dueDate },
            actionTypeId: 'REMINDER_ACTION',
            extra: {
              reminderId: reminder.id,
              isDueDate: true
            }
          }
        ]
      })
    } else {
      const notificationOptions = {
        body: `${reminder.description} - ${reminder.amount} due soon`,
        icon: '/icon.png',
        actions: [
          { action: 'pay-now', title: 'Pay Now' },
          { action: 'remind-later', title: 'Remind Later' }
        ],
        data: {
          reminderId: reminder.id,
          isDueDate: false,
          title: reminder.description,
          options: { /* notification options */ }
        }
      }

      // Schedule 2 days before
      if (twoDaysBefore > new Date()) {
        scheduleNotification(reminder.description, {
          ...notificationOptions,
          body: `${reminder.description} due in 2 days`,
        }, twoDaysBefore)
      }

      // Schedule 1 day before
      if (oneDayBefore > new Date()) {
        scheduleNotification(reminder.description, {
          ...notificationOptions,
          body: `${reminder.description} due tomorrow`,
        }, oneDayBefore)
      }

      // Schedule due date notifications every 2 hours
      if (dueDate > new Date()) {
        notificationOptions.data.isDueDate = true
        scheduleNotification(reminder.description, {
          ...notificationOptions,
          body: `${reminder.description} due today!`,
        }, dueDate)
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
                title: 'Paid ✓'
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

  return {
    hasPermission,
    requestPermission,
    scheduleReminderNotifications,
    testNotification
  }
})
