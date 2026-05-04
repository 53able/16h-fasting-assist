/**
 * Zod schema-first definition for {@link UserProfile}.
 */

import { z } from 'zod';

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string(),
  lifestyle: z.enum(['morning', 'evening', 'shift', 'custom']),
  defaultFastingHours: z.number().int().min(8).max(24),
  notificationEnabled: z.boolean(),
  termsAcceptedAt: z.string().nullable(),
  termsVersion: z.string(),
  weekendOnly: z.boolean(),
  activePresetId: z.string().uuid().nullable(),
});

export type UserProfileParsed = z.infer<typeof userProfileSchema>;
