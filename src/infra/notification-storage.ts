/**
 * Infrastructure Layer - Notification Storage
 * Helper to store/check scheduled milestones in IndexedDB via a dedicated Dexie table.
 *
 * Table: fastandfeed_scheduled_milestones
 * Primary key: [sessionId+milestoneHours]
 */

import Dexie, { Table } from 'dexie';

interface ScheduledMilestoneRecord {
  sessionId: string;
  milestoneHours: number;
  /** Unix timestamp (ms) when the notification is scheduled to fire */
  scheduledAt: number;
}

class MilestoneDB extends Dexie {
  fastandfeed_scheduled_milestones!: Table<ScheduledMilestoneRecord, [string, number]>;

  constructor() {
    super('MilestoneNotificationDB');
    this.version(1).stores({
      fastandfeed_scheduled_milestones: '[sessionId+milestoneHours], sessionId, scheduledAt',
    });
  }
}

const milestoneDb = new MilestoneDB();

/**
 * Persist the scheduled timestamp for a milestone so it survives page reloads.
 */
export async function saveMilestoneTimestamp(
  sessionId: string,
  milestoneHours: number,
  timestamp: number,
): Promise<void> {
  await milestoneDb.fastandfeed_scheduled_milestones.put({
    sessionId,
    milestoneHours,
    scheduledAt: timestamp,
  });
}

/**
 * Retrieve the scheduled timestamp for a milestone, or null if not stored.
 */
export async function getMilestoneTimestamp(
  sessionId: string,
  milestoneHours: number,
): Promise<number | null> {
  const record = await milestoneDb.fastandfeed_scheduled_milestones.get([
    sessionId,
    milestoneHours,
  ]);
  return record?.scheduledAt ?? null;
}

/**
 * Return milestone hours that were scheduled in the past but never fired
 * (i.e. the scheduled time has already passed).
 */
export async function checkMissingMilestones(sessionId: string): Promise<number[]> {
  const now = Date.now();
  const records = await milestoneDb.fastandfeed_scheduled_milestones
    .where('sessionId')
    .equals(sessionId)
    .toArray();

  return records
    .filter((r) => r.scheduledAt <= now)
    .map((r) => r.milestoneHours)
    .sort((a, b) => a - b);
}

/**
 * Remove all milestone records for a session (e.g. on session end).
 */
export async function clearMilestones(sessionId: string): Promise<void> {
  await milestoneDb.fastandfeed_scheduled_milestones
    .where('sessionId')
    .equals(sessionId)
    .delete();
}
