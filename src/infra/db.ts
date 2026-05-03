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
} from '../domain/types';

/**
 * AppDB - Dexie Database Schema Definition
 *
 * Versioning Strategy:
 * - v1 (current): Initial schema with fastingSessions, workoutLogs, healthMetrics
 * - v2 (future): Add presetSchedules table, rename fields for consistency
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

  constructor() {
    super('SixteenHourFastDB');
    this.version(1).stores({
      // Primary keys + indices
      // Syntax: 'primaryKey, index1, index2, [compound+indices]'

      // fastingSessions: status and startedAt often queried together for active session list
      fastingSessions:
        'id, status, startedAt, [status+startedAt]',

      // workoutLogs: typically filtered by performedAt (history view),
      // type (activity type stats), or fastingSessionId (correlation)
      workoutLogs:
        'id, performedAt, type, fastingSessionId',

      // healthMetrics: compound index critical for dashboard queries
      // e.g., "get all weight measurements in last 30 days"
      healthMetrics:
        'id, recordedAt, type, [type+recordedAt]',
    });

    // Future: v2 migration placeholder
    // Uncomment and implement when adding new tables or schema changes:
    // this.version(2).stores({...}).upgrade(...)
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
    // Test database connectivity
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
  ]);
  console.log('All database tables cleared.');
}
