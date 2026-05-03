import { describe, it, expect, beforeEach } from 'vitest';
import type { IFastingRepository } from '../../domain/ports/fasting-repository';
import { createISO8601String, now } from '../../domain/types';
import type { FastingSession, SOSEvent } from '../../domain/types';
import { deleteSOSEvent, recordSOSEvent } from './sos-service';

const makeSession = (sosEvents: SOSEvent[]): FastingSession => {
  const startedAt = createISO8601String(new Date('2026-01-01T08:00:00.000Z'));
  const scheduledEndAt = createISO8601String(new Date('2026-01-02T00:00:00.000Z'));
  return {
    id: 'session-11111111-1111-1111-1111-111111111111',
    startedAt,
    scheduledEndAt,
    completedAt: null,
    targetHours: 16,
    status: 'active',
    sosEvents,
    bodyStatusSnapshots: [],
  };
};

describe('sos-service', () => {
  let saved: FastingSession | null;
  let repository: IFastingRepository;

  beforeEach(() => {
    saved = makeSession([]);
    repository = {
      save: async (session: FastingSession) => {
        saved = session;
      },
      findById: async (id: string) => {
        if (saved === null || saved.id !== id) {
          return null;
        }
        return saved;
      },
      findActive: async () => saved,
      findByDateRange: async () => [],
      delete: async () => {},
      findByStatus: async () => [],
    };
  });

  it('deleteSOSEvent removes one event and persists the rest', async () => {
    const e1: SOSEvent = {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      recordedAt: now(),
      foodCategory: 'nuts',
      estimatedCalories: 100,
      note: null,
    };
    const e2: SOSEvent = {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      recordedAt: now(),
      foodCategory: 'broth',
      estimatedCalories: null,
      note: 'test',
    };
    saved = makeSession([e1, e2]);

    await deleteSOSEvent(repository, saved.id, e1.id);

    expect(saved).not.toBeNull();
    expect(saved?.sosEvents).toHaveLength(1);
    expect(saved?.sosEvents[0]?.id).toBe(e2.id);
  });

  it('deleteSOSEvent is a no-op when the id is missing', async () => {
    const e1: SOSEvent = {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      recordedAt: now(),
      foodCategory: 'other',
      estimatedCalories: null,
      note: null,
    };
    saved = makeSession([e1]);
    let saveCalls = 0;
    const countingRepo: IFastingRepository = {
      ...repository,
      save: async (session: FastingSession) => {
        saveCalls += 1;
        saved = session;
      },
    };

    await deleteSOSEvent(countingRepo, saved.id, 'nonexistent-id');

    expect(saved?.sosEvents).toHaveLength(1);
    expect(saveCalls).toBe(0);
  });

  it('recordSOSEvent then deleteSOSEvent clears that event', async () => {
    saved = makeSession([]);
    await recordSOSEvent(repository, saved.id, 'cheese', 50);
    const addedId = saved?.sosEvents[0]?.id;
    expect(addedId).toBeDefined();

    await deleteSOSEvent(repository, saved.id, addedId as string);

    expect(saved?.sosEvents).toHaveLength(0);
  });
});
