/**
 * useWorkout Hook
 * Manages workout logging, history, and streak tracking.
 */

import { useState, useEffect, useCallback } from 'react';
import { WorkoutLog, ExerciseEntry } from '../../domain/types';
import { IWorkoutRepository } from '../../domain/ports/workout-repository';
import { saveWorkout, getStreak } from '../services/workout-service';

interface UseWorkoutResult {
  workouts: WorkoutLog[];
  currentStreak: number;
  longestStreak: number;
  saveWorkout: (
    type: WorkoutLog['type'],
    exercises: ExerciseEntry[],
    durationMinutes: number,
    sessionId?: string,
    note?: string,
  ) => Promise<void>;
  isLoading: boolean;
}

export function useWorkout(repository: IWorkoutRepository): UseWorkoutResult {
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(() => {
    let cancelled = false;

    setIsLoading(true);

    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 90); // last 90 days

    Promise.all([
      repository.findByDateRange(from, to),
      repository.calculateStreak(),
    ])
      .then(([logs, streak]) => {
        if (!cancelled) {
          setWorkouts(logs);
          setCurrentStreak(streak.currentStreak);
          setLongestStreak(streak.longestStreak);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWorkouts([]);
          setCurrentStreak(0);
          setLongestStreak(0);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [repository]);

  useEffect(() => {
    const cleanup = loadData();
    return cleanup;
  }, [loadData]);

  const handleSaveWorkout = useCallback(
    async (
      type: WorkoutLog['type'],
      exercises: ExerciseEntry[],
      durationMinutes: number,
      sessionId?: string,
      note?: string,
    ): Promise<void> => {
      setIsLoading(true);
      try {
        await saveWorkout(repository, type, exercises, durationMinutes, sessionId, note);
        await getStreak(repository).then((streak) => {
          setCurrentStreak(streak.currentStreak);
          setLongestStreak(streak.longestStreak);
        });
        const to = new Date();
        const from = new Date(to);
        from.setDate(from.getDate() - 90);
        const logs = await repository.findByDateRange(from, to);
        setWorkouts(logs);
      } finally {
        setIsLoading(false);
      }
    },
    [repository],
  );

  return {
    workouts,
    currentStreak,
    longestStreak,
    saveWorkout: handleSaveWorkout,
    isLoading,
  };
}
