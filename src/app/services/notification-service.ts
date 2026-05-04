/**
 * Notification Service
 * Service worker registration and milestone correction logic.
 */

import { buildScheduledMilestones } from '../../domain/milestone-plan';
import type { FastingSession } from '../../domain/types';
import { getPushMilestoneBannerMessage } from './api-client';

function buildDefinitionsForSession(session: FastingSession): { hours: number; message: string }[] {
  const digestion = {
    hours: 2,
    message: '消化フェーズ完了！グリコーゲン消費がスタートしました。',
  };
  const linked = buildScheduledMilestones(session.targetHours).map((m) => ({
    hours: m.hours,
    message: getPushMilestoneBannerMessage(m.label),
  }));
  return [digestion, ...linked];
}

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
  const definitions = buildDefinitionsForSession(session);
  return definitions.some((m) => m.hours <= elapsedHours);
}

/**
 * Get all milestone messages applicable at the given elapsed hours.
 *
 * @param elapsedHours - Hours elapsed since fasting started
 * @param targetHours - Session goal length
 * @returns Array of milestone messages that apply at this point in time
 */
export function getMilestoneMessages(elapsedHours: number, targetHours: number): string[] {
  const digestion = {
    hours: 2,
    message: '消化フェーズ完了！グリコーゲン消費がスタートしました。',
  };
  const linked = buildScheduledMilestones(targetHours).map((m) => ({
    hours: m.hours,
    message: getPushMilestoneBannerMessage(m.label),
  }));
  const definitions = [digestion, ...linked];
  return definitions.filter((m) => m.hours <= elapsedHours).map((m) => m.message);
}
