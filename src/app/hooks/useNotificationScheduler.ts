/**
 * useNotificationScheduler Hook
 * Manages milestone notification scheduling for an active fasting session.
 *
 * - On mount: schedules 10h / 16h notifications via scheduleMilestoneNotifications.
 * - On unmount: cancels all pending setTimeout timers to prevent memory leaks.
 * - Exposes isScheduled so the UI can reflect scheduling state.
 *
 * The caller must supply a MilestoneStorage adapter (e.g. from infra/notification-storage)
 * so this hook remains free of direct infra dependencies.
 */

import { useState, useEffect, useRef } from 'react';
import { ISO8601String } from '../../domain/types';
import { scheduleMilestoneNotifications, MilestoneStorage } from '../services/notification-scheduler';

interface UseNotificationSchedulerProps {
  sessionId: string;
  startedAt: ISO8601String;
  /** Stable id for Web Push + /api/trigger routing. */
  subscriberId: string;
  /** Persistence adapter for milestone timestamps. */
  storage: MilestoneStorage;
  /** Optional callback to show an in-app banner when /api/trigger fails. */
  onFallback?: (message: string) => void;
}

interface UseNotificationSchedulerResult {
  isScheduled: boolean;
}

export function useNotificationScheduler({
  sessionId,
  startedAt,
  subscriberId,
  storage,
  onFallback,
}: UseNotificationSchedulerProps): UseNotificationSchedulerResult {
  const [isScheduled, setIsScheduled] = useState(false);
  const timerIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (sessionId === '' || startedAt === '') {
      return;
    }

    let cancelled = false;

    scheduleMilestoneNotifications(sessionId, startedAt, subscriberId, storage, onFallback)
      .then((ids) => {
        if (!cancelled) {
          timerIdsRef.current = ids;
          setIsScheduled(true);
        } else {
          // Component unmounted before scheduling completed — clear any timers
          for (const id of ids) {
            clearTimeout(id);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsScheduled(false);
        }
      });

    return () => {
      cancelled = true;
      for (const id of timerIdsRef.current) {
        clearTimeout(id);
      }
      timerIdsRef.current = [];
      setIsScheduled(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, startedAt, subscriberId, storage, onFallback]);

  return { isScheduled };
}
