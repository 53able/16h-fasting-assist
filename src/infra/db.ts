/**
 * Infrastructure Layer - Dexie Database
 * IndexedDB abstraction using Dexie library for type-safe database access.
 *
 * IMPORTANT: This file is the sole IDB implementation. Domain layer accesses
 * persistence via IFastingRepository et al. ports, not directly through this module.
 */

import Dexie, { Table } from 'dexie';
import {
  FastingSession,
  WorkoutLog,
  HealthMetric,
  UserProfile,
  PresetSchedule,
} from '../domain/types';
import {
  createDefaultUserProfile,
  DEFAULT_USER_PROFILE_ID,
} from '../domain/user-profile-default';

/** Built-in preset rows (also used by {@link ensureDatabaseSeed}). */
export const SEED_PRESET_SCHEDULES: PresetSchedule[] = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    name: '夜間空腹（早め夕食）',
    fastingStartHour: 18,
    fastingDurationHours: 16,
    lifestyle: 'evening',
    isCustom: false,
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    name: '日中空腹（遅め夕食）',
    fastingStartHour: 22,
    fastingDurationHours: 16,
    lifestyle: 'morning',
    isCustom: false,
  },
];

/**
 * Ensures preset schedules and default user profile exist (idempotent).
 * Call after {@link db} is open — e.g. on app boot — so fresh installs and
 * migrations always have seed data even if Dexie upgrade hooks differ by environment.
 */
export async function ensureDatabaseSeed(): Promise<void> {
  await db.open();
  if ((await db.presetSchedules.count()) === 0) {
    await db.presetSchedules.bulkPut(SEED_PRESET_SCHEDULES);
  }
  if ((await db.userProfiles.get(DEFAULT_USER_PROFILE_ID)) === undefined) {
    await db.userProfiles.add(createDefaultUserProfile());
  }
}

/**
 * AppDB - Dexie Database Schema Definition
 *
 * Versioning Strategy:
 * - v1: fastingSessions, workoutLogs, healthMetrics
 * - v2: userProfiles, presetSchedules + seed presets and default profile row
 *
 * Migration Notes:
 * When upgrading to v2, use db.version(2).stores({...}) and db.version(2).upgrade(tx => {...})
 * to perform schema migrations without data loss.
 *
 * Example v2 migration:
 * ```
 * db.version(2)
 *   .stores({
 *     fastingSessions: 'id, status, startedAt, [status+startedAt]',
 *     workoutLogs: 'id, performedAt, type, fastingSessionId',
 *     healthMetrics: 'id, recordedAt, type, [type+recordedAt]',
 *     presetSchedules: 'id, lifestyle'
 *   })
 *   .upgrade(tx => {
 *     // Data transformation logic here
 *   });
 * ```
 */
export class AppDB extends Dexie {
  /**
   * Fasting sessions table
   * Compound index [status+startedAt] for filtering active sessions by date
   */
  fastingSessions!: Table<FastingSession, string>;

  /**
   * Workout logs table
   * Indices support filtering by performedAt (history), type (stats), fastingSessionId (correlation)
   */
  workoutLogs!: Table<WorkoutLog, string>;

  /**
   * Health metrics table
   * Compound index [type+recordedAt] for dashboard queries (e.g., "weight in last 30 days")
   */
  healthMetrics!: Table<HealthMetric, string>;

  userProfiles!: Table<UserProfile, string>;

  presetSchedules!: Table<PresetSchedule, string>;

  constructor() {
    super('SixteenHourFastDB');
    this.version(1).stores({
      fastingSessions:
        'id, status, startedAt, [status+startedAt]',

      workoutLogs:
        'id, performedAt, type, fastingSessionId',

      healthMetrics:
        'id, recordedAt, type, [type+recordedAt]',
    });

    this.version(2)
      .stores({
        fastingSessions:
          'id, status, startedAt, [status+startedAt]',
        workoutLogs:
          'id, performedAt, type, fastingSessionId',
        healthMetrics:
          'id, recordedAt, type, [type+recordedAt]',
        userProfiles: 'id',
        presetSchedules: 'id, lifestyle',
      })
      .upgrade(async () => {
        /* Schema add only; data seeding via ensureDatabaseSeed() on boot. */
      });
  }
}

/**
 * Global database instance
 * Single instance shared across application via dependency injection in services
 */
export const db = new AppDB();

/**
 * Initialize database connection
 * Called once on application startup
 */
export async function initializeDatabase(): Promise<void> {
  try {
    await ensureDatabaseSeed();
    const count = await db.fastingSessions.count();
    console.log(`Database initialized. Existing sessions: ${count}`);
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Clear all tables (dangerous - test/reset only)
 * @param skipBackup If true, skip backup and proceed with deletion
 */
export async function clearAllTables(skipBackup: boolean = false): Promise<void> {
  if (!skipBackup) {
    console.warn('clearAllTables() called without backup. Use skipBackup=true to confirm.');
    return;
  }
  await Promise.all([
    db.fastingSessions.clear(),
    db.workoutLogs.clear(),
    db.healthMetrics.clear(),
    db.userProfiles.clear(),
    db.presetSchedules.clear(),
  ]);
  console.log('All database tables cleared.');
}
