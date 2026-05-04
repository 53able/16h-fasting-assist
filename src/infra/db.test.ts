import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { createISO8601String } from '../domain/types';
import type { FastingSession } from '../domain/types';
import { db, ensureDatabaseSeed } from './db';

describe('AppDB', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await ensureDatabaseSeed();
  });

  it('v2 seeds presets and default profile', async () => {
    expect(await db.userProfiles.count()).toBe(1);
    expect(await db.presetSchedules.count()).toBe(2);
  });

  it('persists a fasting session', async () => {
    expect(await db.fastingSessions.count()).toBe(0);

    const startedAt = createISO8601String(new Date('2026-01-01T00:00:00.000Z'));
    const scheduledEndAt = createISO8601String(new Date('2026-01-01T16:00:00.000Z'));
    const session: FastingSession = {
      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      startedAt,
      scheduledEndAt,
      completedAt: null,
      targetHours: 16,
      status: 'active',
      sosEvents: [],
      bodyStatusSnapshots: [],
    };

    await db.fastingSessions.add(session);
    expect(await db.fastingSessions.count()).toBe(1);
    const loaded = await db.fastingSessions.get(session.id);
    expect(loaded?.id).toBe(session.id);
    expect(loaded?.status).toBe('active');
  });
});
