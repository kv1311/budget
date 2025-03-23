self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  const { action, notification } = event;
  const data = notification.data;

  notification.close();

  // Handle test notifications
  if (data.type === 'test') {
    if (action === 'pay-now') {
      clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'test-payment',
            reminder: data.reminder
          });
        });
      });
    } else if (action === 'remind-later') {
      const nextNotification = Date.now() + (2 * 60 * 60 * 1000); // 2 hours
      self.registration.showNotification(data.title, {
        ...data.options,
        timestamp: nextNotification,
        data: data
      });
    }
    return;
  }

  // Handle real reminders
  if (action === 'pay-now') {
    // Post message to client to handle payment
    clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'pay-reminder',
          reminderId: data.reminderId
        });
      });
    });
  } else if (action === 'remind-later') {
    // Schedule next notification in 2 hours if on due date
    if (data.isDueDate) {
      const nextNotification = Date.now() + (2 * 60 * 60 * 1000); // 2 hours
      self.registration.showNotification(data.title, {
        ...data.options,
        timestamp: nextNotification
      });
    }
  }
});
