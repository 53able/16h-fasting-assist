/**
 * useSOS Hook
 * Manages SOS event recording and retrieval for the active fasting session.
 */

import { useState, useEffect, useCallback } from 'react';
import { SOSEvent } from '../../domain/types';
import { IFastingRepository } from '../../domain/ports/fasting-repository';
import { deleteSOSEvent, recordSOSEvent } from '../services/sos-service';

interface UseSOSResult {
  recordSOSEvent: (
    foodCategory: SOSEvent['foodCategory'],
    estimatedCalories?: number,
    note?: string,
  ) => Promise<void>;
  deleteSOSEvent: (eventId: string) => Promise<void>;
  sosEvents: SOSEvent[];
  isLoading: boolean;
}

export function useSOS(repository: IFastingRepository, sessionId: string | null): UseSOSResult {
  const [sosEvents, setSosEvents] = useState<SOSEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load SOS events from the active session on mount or session change
  useEffect(() => {
    if (sessionId === null) {
      setSosEvents([]);
      return;
    }

    let cancelled = false;

    setIsLoading(true);
    repository
      .findById(sessionId)
      .then((session) => {
        if (!cancelled) {
          setSosEvents(session !== null ? session.sosEvents : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSosEvents([]);
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
  }, [repository, sessionId]);

  const handleRecordSOSEvent = useCallback(
    async (
      foodCategory: SOSEvent['foodCategory'],
      estimatedCalories?: number,
      note?: string,
    ): Promise<void> => {
      if (sessionId === null) {
        return;
      }

      setIsLoading(true);
      try {
        await recordSOSEvent(repository, sessionId, foodCategory, estimatedCalories, note);
        // Reload events after recording
        const updated = await repository.findById(sessionId);
        setSosEvents(updated !== null ? updated.sosEvents : []);
      } finally {
        setIsLoading(false);
      }
    },
    [repository, sessionId],
  );

  const handleDeleteSOSEvent = useCallback(
    async (eventId: string): Promise<void> => {
      if (sessionId === null) {
        return;
      }

      setIsLoading(true);
      try {
        await deleteSOSEvent(repository, sessionId, eventId);
        const updated = await repository.findById(sessionId);
        setSosEvents(updated !== null ? updated.sosEvents : []);
      } finally {
        setIsLoading(false);
      }
    },
    [repository, sessionId],
  );

  return {
    recordSOSEvent: handleRecordSOSEvent,
    deleteSOSEvent: handleDeleteSOSEvent,
    sosEvents,
    isLoading,
  };
}
