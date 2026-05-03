/**
 * Timer Store - Zustand store for countdown timer state
 * Persists to localStorage for recovery after browser reload.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TimerState {
  isRunning: boolean;
  lastTickTime: number;
  elapsedSeconds: number;
}

interface TimerActions {
  start: () => void;
  pause: () => void;
  reset: () => void;
  tick: () => void;
}

type TimerStore = TimerState & TimerActions;

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      isRunning: false,
      lastTickTime: 0,
      elapsedSeconds: 0,

      start: () => {
        set({ isRunning: true, lastTickTime: Date.now() });
      },

      pause: () => {
        set({ isRunning: false });
      },

      reset: () => {
        set({ isRunning: false, lastTickTime: 0, elapsedSeconds: 0 });
      },

      tick: () => {
        const { isRunning, lastTickTime, elapsedSeconds } = get();
        if (!isRunning) return;

        const now = Date.now();
        const delta = lastTickTime > 0 ? Math.floor((now - lastTickTime) / 1000) : 1;

        set({
          elapsedSeconds: elapsedSeconds + delta,
          lastTickTime: now,
        });
      },
    }),
    {
      name: 'timer-store',
    },
  ),
);
