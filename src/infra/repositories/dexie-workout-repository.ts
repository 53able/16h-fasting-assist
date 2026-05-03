/**
 * Infrastructure Layer - Dexie Workout Repository
 * Implements IWorkoutRepository using Dexie/IndexedDB.
 */

import { db } from '../db';
import { IWorkoutRepository } from '../../domain/ports/workout-repository';
import { WorkoutLog } from '../../domain/types';

export class DexieWorkoutRepository implements IWorkoutRepository {
  async save(log: WorkoutLog): Promise<void> {
    await db.workoutLogs.put(log);
  }

  async findByDateRange(from: Date, to: Date): Promise<WorkoutLog[]> {
    const fromISO = from.toISOString();
    const toISO = to.toISOString();
    const logs = await db.workoutLogs
      .where('performedAt')
      .between(fromISO, toISO, true, true)
      .toArray();
    return logs.sort((a, b) => a.performedAt.localeCompare(b.performedAt));
  }

  async delete(id: string): Promise<void> {
    await db.workoutLogs.delete(id);
  }

  async findByFastingSessionId(sessionId: string): Promise<WorkoutLog[]> {
    return db.workoutLogs
      .where('fastingSessionId')
      .equals(sessionId)
      .toArray();
  }

  async calculateStreak(): Promise<{ currentStreak: number; longestStreak: number }> {
    const allLogs = await db.workoutLogs
      .orderBy('performedAt')
      .toArray();

    if (allLogs.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Collect unique workout dates (YYYY-MM-DD)
    const workoutDays = new Set(
      allLogs.map((log) => log.performedAt.slice(0, 10))
    );
    const sortedDays = Array.from(workoutDays).sort();

    // Calculate longest streak
    let longestStreak = 1;
    let runningStreak = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const prev = new Date(sortedDays[i - 1]);
      const curr = new Date(sortedDays[i]);
      const diffDays = Math.round(
        (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays === 1) {
        runningStreak += 1;
        if (runningStreak > longestStreak) {
          longestStreak = runningStreak;
        }
      } else {
        runningStreak = 1;
      }
    }

    // Calculate current streak from today backwards
    const todayStr = new Date().toISOString().slice(0, 10);
    let currentStreak = 0;
    const checkDate = new Date(todayStr);

    for (;;) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      if (workoutDays.has(dateStr)) {
        currentStreak += 1;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return { currentStreak, longestStreak };
  }
}
