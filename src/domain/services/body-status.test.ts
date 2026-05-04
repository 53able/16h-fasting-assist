import { describe, it, expect, vi } from 'vitest';
import { calculateBodyStatus } from './body-status';
import type { ISO8601String } from '../types';

describe('calculateBodyStatus', () => {
  it('maps sub-16h goals with scaled phases without jumping to autophagy early', () => {
    const startedAt = '2026-05-04T08:00:00.000Z' as ISO8601String;
    const scheduledEndAt = '2026-05-04T22:00:00.000Z' as ISO8601String;
    const mid = '2026-05-04T15:00:00.000Z' as ISO8601String;
    const mockNow = new Date(mid).getTime();
    vi.spyOn(Date, 'now').mockReturnValue(mockNow);

    const status = calculateBodyStatus(startedAt, scheduledEndAt);
    expect(status.phase).not.toBe('autophagy');
    expect(status.progressRatio).toBeGreaterThan(0);
    expect(status.progressRatio).toBeLessThan(1);

    vi.restoreAllMocks();
  });

  it('shows autophagy at goal when target is at least 16 hours', () => {
    const startedAt = '2026-05-04T08:00:00.000Z' as ISO8601String;
    const scheduledEndAt = '2026-05-05T00:00:00.000Z' as ISO8601String;
    const mockNow = new Date(scheduledEndAt).getTime();
    vi.spyOn(Date, 'now').mockReturnValue(mockNow);

    const status = calculateBodyStatus(startedAt, scheduledEndAt);
    expect(status.phase).toBe('autophagy');
    expect(status.remainingHours).toBe(0);

    vi.restoreAllMocks();
  });

  it('uses fat-burning goal message when completing under 16h target', () => {
    const startedAt = '2026-05-04T08:00:00.000Z' as ISO8601String;
    const scheduledEndAt = '2026-05-04T22:00:00.000Z' as ISO8601String;
    const mockNow = new Date(scheduledEndAt).getTime();
    vi.spyOn(Date, 'now').mockReturnValue(mockNow);

    const status = calculateBodyStatus(startedAt, scheduledEndAt);
    expect(status.phase).toBe('fat-burning');
    expect(status.description).toContain('目標達成');

    vi.restoreAllMocks();
  });
});
