/**
 * POST /api/subscribe — persists Web Push subscription in Upstash Redis (VAPID keys live on trigger).
 */

import { subscribeBodySchema } from './push-schemas.js';
import { redisCommand, subscriptionRedisKey } from './redis-rest.js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
};

const corsHeaders = (): HeadersInit => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
});

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders() });
  }

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, message: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders() } },
    );
  }

  try {
    const raw: unknown = await request.json();
    const parsed = subscribeBodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid request body',
          issues: parsed.error.issues,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders() } },
      );
    }

    const { subscriberId, subscription } = parsed.data;
    const key = subscriptionRedisKey(subscriberId);
    const row = JSON.stringify({
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      updatedAt: new Date().toISOString(),
    });

    await redisCommand(['SET', key, row]);

    return new Response(JSON.stringify({ success: true, message: 'Subscription stored' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    const isConfig = msg.includes('not configured');
    return new Response(
      JSON.stringify({
        success: false,
        message: isConfig ? 'Push storage is not configured on the server' : msg,
      }),
      {
        status: isConfig ? 503 : 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      },
    );
  }
}
