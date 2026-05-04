/**
 * Default {@link UserProfile} factory for first launch and migrations.
 */

import type { UserProfile } from './types';
import { now } from './types';

/** Primary key for the single-row user profile in IndexedDB. */
export const DEFAULT_USER_PROFILE_ID = '00000000-0000-4000-8000-000000000001';

/**
 * Creates the canonical default profile stored under {@link DEFAULT_USER_PROFILE_ID}.
 */
export const createDefaultUserProfile = (): UserProfile => ({
  id: DEFAULT_USER_PROFILE_ID,
  createdAt: now(),
  lifestyle: 'custom',
  defaultFastingHours: 16,
  notificationEnabled: true,
  termsAcceptedAt: null,
  termsVersion: '',
  weekendOnly: false,
  activePresetId: null,
});
