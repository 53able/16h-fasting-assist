/**
 * Service Worker - Push Notification Handler
 * Handles push events and shows notifications for fasting milestones.
 */

/* eslint-disable no-restricted-globals */

self.addEventListener('push', function (event) {
  /** @type {{ title: string, body?: string, icon?: string, badge?: string, tag?: string, requireInteraction?: boolean }} */
  const data = event.data ? event.data.json() : {};

  const title = data.title || '16時間断食';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/badge-72.png',
    tag: data.tag || 'fasting-milestone',
    requireInteraction: data.requireInteraction === true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    }),
  );
});
