/**
 * Derives push notification milestones from session target duration.
 *
 * Rules (aligned with product plan):
 * - targetHours >= 16: 10h fat-burn cue, 16h autophagy cue.
 * - 12 <= targetHours < 16: 10h cue + goal at targetHours (no autophagy claim).
 * - 10 <= targetHours < 12: 10h cue + goal at targetHours (if distinct).
 * - targetHours < 10: goal-only at targetHours.
 */

/** Labels accepted by POST /api/trigger for push payloads. */
export const PUSH_MILESTONE_LABELS = ['10-hour', '16-hour', 'target-reached'] as const;

export type PushMilestoneLabel = (typeof PUSH_MILESTONE_LABELS)[number];

export interface ScheduledMilestone {
  /** Wall-clock hours after session start when this milestone fires. */
  hours: number;
  label: PushMilestoneLabel;
}

/**
 * Builds ordered milestones for a fasting session.
 *
 * @param targetHours - Session goal length in hours (from `FastingSession.targetHours`).
 */
export const buildScheduledMilestones = (targetHours: number): ScheduledMilestone[] => {
  const t = Math.floor(targetHours);
  if (t < 1) {
    return [{ hours: 1, label: 'target-reached' }];
  }

  if (t >= 16) {
    return [
      { hours: 10, label: '10-hour' },
      { hours: 16, label: '16-hour' },
    ];
  }

  if (t > 10) {
    return [
      { hours: 10, label: '10-hour' },
      { hours: t, label: 'target-reached' },
    ];
  }

  if (t === 10) {
    return [{ hours: 10, label: 'target-reached' }];
  }

  return [{ hours: t, label: 'target-reached' }];
};
