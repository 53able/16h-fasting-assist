/**
 * Stable anonymous id for Web Push (localStorage). Used by App and NotificationGateway.
 */

const STORAGE_KEY = 'push_subscriber_id_v1';

/**
 * Returns persisted UUID or creates one with crypto.randomUUID().
 */
export const getOrCreateSubscriberId = (): string => {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing !== null && existing.length > 0) {
      return existing;
    }
    const id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return '';
  }
};
