/**
 * Workout Service
 * Saves a WorkoutLog via IWorkoutRepository and retrieves streak data.
 */

import { IWorkoutRepository } from '../../domain/ports/workout-repository';
import { WorkoutLog, ExerciseEntry, now } from '../../domain/types';

export async function saveWorkout(
  repository: IWorkoutRepository,
  type: WorkoutLog['type'],
  exercises: ExerciseEntry[],
  durationMinutes: number,
  sessionId?: string,
  note?: string,
): Promise<WorkoutLog> {
  const log: WorkoutLog = {
    id: crypto.randomUUID(),
    performedAt: now(),
    type,
    exercises,
    durationMinutes,
    fastingSessionId: sessionId !== undefined ? sessionId : null,
    note: note !== undefined ? note : null,
  };

  await repository.save(log);
  return log;
}

export async function getStreak(
  repository: IWorkoutRepository,
): Promise<{ currentStreak: number; longestStreak: number }> {
  return repository.calculateStreak();
}
