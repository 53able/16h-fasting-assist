import { describe, it, expect } from 'vitest';
import { buildScheduledMilestones } from './milestone-plan';

describe('buildScheduledMilestones', () => {
  it('uses 10h and 16h labels when target is 16 or more', () => {
    expect(buildScheduledMilestones(16)).toEqual([
      { hours: 10, label: '10-hour' },
      { hours: 16, label: '16-hour' },
    ]);
    expect(buildScheduledMilestones(20)).toEqual([
      { hours: 10, label: '10-hour' },
      { hours: 16, label: '16-hour' },
    ]);
  });

  it('schedules target-reached instead of 16-hour when target is 12–15', () => {
    expect(buildScheduledMilestones(14)).toEqual([
      { hours: 10, label: '10-hour' },
      { hours: 14, label: 'target-reached' },
    ]);
    expect(buildScheduledMilestones(12)).toEqual([
      { hours: 10, label: '10-hour' },
      { hours: 12, label: 'target-reached' },
    ]);
  });

  it('uses only target-reached at 10h when goal is exactly 10 hours', () => {
    expect(buildScheduledMilestones(10)).toEqual([{ hours: 10, label: 'target-reached' }]);
  });

  it('uses goal-only milestones when target is under 10 hours', () => {
    expect(buildScheduledMilestones(8)).toEqual([{ hours: 8, label: 'target-reached' }]);
  });
});
