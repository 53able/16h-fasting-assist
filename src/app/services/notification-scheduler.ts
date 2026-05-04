/**
 * Notification Scheduler Service
 * Schedules milestone notifications from {@link buildScheduledMilestones}.
 *
 * Strategy:
 * 1. Calculate the exact wall-clock time each milestone fires.
 * 2. Persist those timestamps via the provided MilestoneStorage adapter.
 * 3. Set a setTimeout in the current window; on firing, POST /api/trigger.
 * 4. On app resume (call scheduleMilestoneNotifications again), any milestone
 *    whose scheduled time has already passed is fired immediately.
 * 5. sessionStorage guards against duplicate firings across tabs.
 */

import { ISO8601String } from '../../domain/types';
import { buildScheduledMilestones, type PushMilestoneLabel } from '../../domain/milestone-plan';
import { triggerNotification, FallbackCallback } from './api-client';

interface MilestoneDefinition {
  hours: number;
  label: PushMilestoneLabel;
}

/** Port interface for milestone persistence — fulfilled by infra/notification-storage */
export interface MilestoneStorage {
  saveMilestoneTimestamp(sessionId: string, milestoneHours: number, timestamp: number): Promise<void>;
  getMilestoneTimestamp(sessionId: string, milestoneHours: number): Promise<number | null>;
  checkMissingMilestones(sessionId: string): Promise<number[]>;
}

/** sessionStorage key prefix to track which milestones have been sent in this tab */
const SS_KEY_PREFIX = 'milestone_sent_';

function sessionStorageKey(sessionId: string, hours: number): string {
  return `${SS_KEY_PREFIX}${sessionId}_${hours}`;
}

function markSentInTab(sessionId: string, hours: number): void {
  try {
    sessionStorage.setItem(sessionStorageKey(sessionId, hours), '1');
  } catch {
    // sessionStorage may be unavailable; fail silently
  }
}

function isSentInTab(sessionId: string, hours: number): boolean {
  try {
    return sessionStorage.getItem(sessionStorageKey(sessionId, hours)) === '1';
  } catch {
    return false;
  }
}

/**
 * Fire a single milestone: POST to /api/trigger and mark as sent in this tab.
 */
async function fireMilestone(
  sessionId: string,
  subscriberId: string,
  milestone: MilestoneDefinition,
  fallbackCallback?: FallbackCallback,
): Promise<void> {
  if (isSentInTab(sessionId, milestone.hours)) {
    return;
  }
  markSentInTab(sessionId, milestone.hours);
  await triggerNotification(sessionId, subscriberId, milestone.label, fallbackCallback);
}

/**
 * Schedule (or immediately fire) milestone notifications for a fasting session.
 *
 * Safe to call multiple times: duplicate scheduling is prevented via the storage
 * adapter and sessionStorage checks.
 *
 * @param sessionId       UUID of the active fasting session.
 * @param startedAt       ISO 8601 string of when the session began.
 * @param targetHours     Session goal (`FastingSession.targetHours`) — drives milestone set.
 * @param subscriberId    Stable client id for Web Push (see `getOrCreateSubscriberId` in infra).
 * @param storage         Persistence adapter (from infra/notification-storage).
 * @param fallbackCallback  Optional callback invoked when /api/trigger fails.
 * @returns Array of timer IDs so callers can cancel on unmount.
 */
export async function scheduleMilestoneNotifications(
  sessionId: string,
  startedAt: ISO8601String,
  targetHours: number,
  subscriberId: string,
  storage: MilestoneStorage,
  fallbackCallback?: FallbackCallback,
): Promise<ReturnType<typeof setTimeout>[]> {
  const milestones = buildScheduledMilestones(targetHours);
  const startMs = new Date(startedAt).getTime();
  const timerIds: ReturnType<typeof setTimeout>[] = [];

  const missed = await storage.checkMissingMilestones(sessionId);
  for (const hours of missed) {
    const milestone = milestones.find((m) => m.hours === hours);
    if (milestone !== undefined) {
      void fireMilestone(sessionId, subscriberId, milestone, fallbackCallback);
    }
  }

  for (const milestone of milestones) {
    const milestoneMs = startMs + milestone.hours * 60 * 60 * 1000;
    const delayMs = milestoneMs - Date.now();

    if (delayMs <= 0) {
      continue;
    }

    const existing = await storage.getMilestoneTimestamp(sessionId, milestone.hours);
    if (existing !== null) {
      if (!isSentInTab(sessionId, milestone.hours)) {
        const remainingMs = existing - Date.now();
        if (remainingMs > 0) {
          const id = setTimeout(() => {
            void fireMilestone(sessionId, subscriberId, milestone, fallbackCallback);
          }, remainingMs);
          timerIds.push(id);
        } else {
          void fireMilestone(sessionId, subscriberId, milestone, fallbackCallback);
        }
      }
      continue;
    }

    await storage.saveMilestoneTimestamp(sessionId, milestone.hours, milestoneMs);

    const id = setTimeout(() => {
      void fireMilestone(sessionId, subscriberId, milestone, fallbackCallback);
    }, delayMs);

    timerIds.push(id);
  }

  return timerIds;
}
