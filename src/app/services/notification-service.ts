/**
 * Notification Service
 * Service worker registration and milestone correction logic.
 */

import { FastingSession } from '../../domain/types';

/** Milestone definitions: hours elapsed → notification message */
const MILESTONE_DEFINITIONS: { hours: number; message: string }[] = [
  { hours: 2, message: '消化フェーズ完了！グリコーゲン消費がスタートしました。' },
  { hours: 10, message: '脂肪燃焼がスタート！ケトン体が増加しています。' },
  { hours: 16, message: 'オートファジー活性！細胞の自己修復が始まりました。' },
];

/**
 * Register the service worker at /service-worker.js.
 * Gracefully handles environments where Service Workers are unavailable.
 */
export async function setupServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    });
    return registration;
  } catch {
    return null;
  }
}

/**
 * Check whether any milestones have passed since the session started
 * that have not yet been shown to the user.
 *
 * @param session - Active fasting session
 * @returns true if at least one unshown milestone has passed
 */
export function checkMilestoneCorrection(session: FastingSession): boolean {
  const elapsedMs = Date.now() - new Date(session.startedAt).getTime();
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  return MILESTONE_DEFINITIONS.some((m) => m.hours <= elapsedHours);
}

/**
 * Get all milestone messages applicable at the given elapsed hours.
 *
 * @param elapsedHours - Hours elapsed since fasting started
 * @returns Array of milestone messages that apply at this point in time
 */
export function getMilestoneMessages(elapsedHours: number): string[] {
  return MILESTONE_DEFINITIONS.filter((m) => m.hours <= elapsedHours).map((m) => m.message);
}
