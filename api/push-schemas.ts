/**
 * Zod schemas for Web Push API request bodies (Zod-first validation).
 */

import { z } from 'zod';

const subscriptionKeysSchema = z.object({
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

/** POST /api/subscribe JSON body */
export const subscribeBodySchema = z.object({
  subscriberId: z.string().uuid(),
  subscription: z.object({
    endpoint: z.string().url(),
    keys: subscriptionKeysSchema,
  }),
});

export type SubscribeBody = z.infer<typeof subscribeBodySchema>;

const milestoneSchema = z.enum([
  '10-hour',
  '16-hour',
  'target-reached',
  'fat-burn',
  'autophagy',
  'complete',
]);

/** POST /api/trigger JSON body (partial) */
export const triggerBodySchema = z.object({
  sessionId: z.string().uuid().optional(),
  milestone: milestoneSchema.optional(),
  subscriberId: z.union([z.string().uuid(), z.string().regex(/^test-/)]).optional(),
});

export type TriggerBody = z.infer<typeof triggerBodySchema>;
