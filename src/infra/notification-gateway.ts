/**
 * Infrastructure Layer - NotificationGateway
 * Implements INotificationGateway using Web Push API and browser Notification API.
 * Falls back to in-app banner when push permission is denied.
 */

import {
  INotificationGateway,
  NotificationOptions,
} from '../domain/ports/notification-gateway';

/** VAPID public key - replace with your actual key from web-push generateVAPIDKeys() */
const VAPID_PUBLIC_KEY =
  'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDkBNW55pocmVG-9KMHuLkJZBqROMSHAiSMPpqF_kNDc';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Callback type for displaying an in-app banner notification */
export type ShowBannerCallback = (title: string, options?: NotificationOptions) => void;

export class NotificationGateway implements INotificationGateway {
  private readonly showBannerCallback: ShowBannerCallback | null;

  constructor(showBannerCallback: ShowBannerCallback | null = null) {
    this.showBannerCallback = showBannerCallback;
  }

  async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const keyArray = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: new Uint8Array(keyArray.buffer as ArrayBuffer),
      });
      return subscription;
    } catch {
      return null;
    }
  }

  async getSubscription(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      return await registration.pushManager.getSubscription();
    } catch {
      return null;
    }
  }

  async showLocalNotification(title: string, options?: NotificationOptions): Promise<void> {
    const permission = await this.getPermissionStatus();

    if (permission === 'granted') {
      try {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(title, {
            body: options?.body,
            icon: options?.icon ?? '/icon-192.png',
            badge: options?.badge ?? '/badge-72.png',
            tag: options?.tag,
            requireInteraction: options?.requireInteraction,
          });
          return;
        }
      } catch {
        // fall through to banner
      }
    }

    // Fallback: in-app banner (works even without push permission)
    if (this.showBannerCallback !== null) {
      this.showBannerCallback(title, options);
    }
  }

  async getPermissionStatus(): Promise<'granted' | 'denied' | 'default'> {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission as 'granted' | 'denied' | 'default';
  }

  async isPersistentStorageGranted(): Promise<boolean> {
    if (!('storage' in navigator) || !('persisted' in navigator.storage)) {
      return false;
    }
    try {
      return await navigator.storage.persisted();
    } catch {
      return false;
    }
  }

  async requestPersistentStorage(): Promise<boolean> {
    if (!('storage' in navigator) || !('persist' in navigator.storage)) {
      return false;
    }
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }
}
