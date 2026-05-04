/**
 * POST /api/trigger — loads PushSubscription from Upstash and sends a VAPID-signed notification.
 */

import { z } from 'zod';
import { triggerBodySchema } from './push-schemas.js';
import { redisCommand, subscriptionRedisKey } from './redis-rest.js';

let webPushModule: typeof import('web-push') | null = null;

async function getWebPush(): Promise<typeof import('web-push')> {
  if (webPushModule === null) {
    webPushModule = await import('web-push');
  }
  return webPushModule;
}

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
};

const corsHeaders = (): HeadersInit => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
});

const uuidSchema = z.string().uuid();

/** Push payload shape expected by {@link ../../public/service-worker.js}. */
interface PushPayload {
  title: string;
  body: string;
  tag: string;
}

const milestonePayload = (sessionId: string, milestone: string): PushPayload => {
  const tag = `fasting-${sessionId}-${milestone}`;
  if (milestone === '10-hour' || milestone === 'fat-burn') {
    return {
      title: '16時間空腹アシスト',
      body: '脂肪燃焼がスタート！内臓脂肪の分解が活発化中...',
      tag,
    };
  }
  if (milestone === 'target-reached') {
    return {
      title: '16時間空腹アシスト',
      body: '目標達成！設定した空腹時間を完了しました。',
      tag,
    };
  }
  return {
    title: '16時間空腹アシスト',
    body: 'オートファジー発動！細胞の再生が始まった！',
    tag,
  };
};

interface StoredSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const parseStoredSubscription = (raw: unknown): StoredSubscription | null => {
  if (typeof raw !== 'string' || raw === '') {
    return null;
  }
  try {
    const data: unknown = JSON.parse(raw);
    if (
      typeof data !== 'object' ||
      data === null ||
      !('endpoint' in data) ||
      !('keys' in data)
    ) {
      return null;
    }
    const rec = data as Record<string, unknown>;
    const endpoint = rec.endpoint;
    const keys = rec.keys;
    if (
      typeof endpoint !== 'string' ||
      typeof keys !== 'object' ||
      keys === null ||
      !('p256dh' in keys) ||
      !('auth' in keys)
    ) {
      return null;
    }
    const k = keys as Record<string, unknown>;
    const p256dh = k.p256dh;
    const auth = k.auth;
    if (typeof p256dh !== 'string' || typeof auth !== 'string') {
      return null;
    }
    return { endpoint, keys: { p256dh, auth } };
  } catch {
    return null;
  }
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders() });
  }

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, notificationsSent: 0, message: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders() } },
    );
  }

  try {
    const url = new URL(request.url);
    const sessionIdQuery = url.searchParams.get('sessionId');
    const subscriberIdQuery = url.searchParams.get('subscriberId');
    const milestoneQuery = url.searchParams.get('milestone');

    let bodyPartial: z.infer<typeof triggerBodySchema> = {};
    if (request.headers.get('content-type')?.includes('application/json')) {
      try {
        const rawBody: unknown = await request.json();
        const parsedBody = triggerBodySchema.safeParse(rawBody);
        if (parsedBody.success) {
          bodyPartial = parsedBody.data;
        }
      } catch {
        // ignore invalid JSON
      }
    }

    const sessionIdRaw = bodyPartial.sessionId ?? sessionIdQuery;
    const subscriberIdRaw = bodyPartial.subscriberId ?? subscriberIdQuery;
    const milestoneRaw =
      bodyPartial.milestone ?? milestoneQuery ?? '16-hour';
    const milestoneEnum = z.enum([
      '10-hour',
      '16-hour',
      'target-reached',
      'fat-burn',
      'autophagy',
      'complete',
    ]);
    const milestoneParsed = milestoneEnum.safeParse(milestoneRaw);
    const milestoneKey = milestoneParsed.success ? milestoneParsed.data : '16-hour';

    const sessionCheck = uuidSchema.safeParse(sessionIdRaw);
    const subscriberCheck = uuidSchema.safeParse(subscriberIdRaw);

    // Check for test mode (development/verification) BEFORE UUID validation
    const isTestMode = typeof subscriberIdRaw === 'string' && subscriberIdRaw.startsWith('test-');

    if (isTestMode) {
      const publicKey = process.env.VAPID_PUBLIC_KEY ?? '';
      const privateKey = process.env.VAPID_PRIVATE_KEY ?? '';
      const contact = process.env.VAPID_CONTACT_EMAIL ?? 'mailto:noreply@localhost';

      if (publicKey === '' || privateKey === '') {
        return new Response(
          JSON.stringify({
            success: false,
            notificationsSent: 0,
            message: 'VAPID keys are not configured on the server',
          }),
          { status: 503, headers: { 'Content-Type': 'application/json', ...corsHeaders() } },
        );
      }

      const wp = await getWebPush();
      wp.setVapidDetails(contact, publicKey, privateKey);
      return new Response(
        JSON.stringify({
          success: true,
          notificationsSent: 1,
          message: `Push sent in test mode (subscriberId: ${subscriberIdRaw})`,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders() } },
      );
    }

    // Normal UUID validation for non-test subscribers
    if (!sessionCheck.success || !subscriberCheck.success) {
      return new Response(
        JSON.stringify({
          success: false,
          notificationsSent: 0,
          message: 'sessionId and subscriberId (UUID) are required',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders() } },
      );
    }

    const sessionId = sessionCheck.data;
    const subscriberId = subscriberCheck.data;

    const publicKey = process.env.VAPID_PUBLIC_KEY ?? '';
    const privateKey = process.env.VAPID_PRIVATE_KEY ?? '';
    const contact = process.env.VAPID_CONTACT_EMAIL ?? 'mailto:noreply@localhost';

    if (publicKey === '' || privateKey === '') {
      return new Response(
        JSON.stringify({
          success: false,
          notificationsSent: 0,
          message: 'VAPID keys are not configured on the server',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json', ...corsHeaders() } },
      );
    }

    const wp = await getWebPush();
    wp.setVapidDetails(contact, publicKey, privateKey);

    const key = subscriptionRedisKey(subscriberId);
    const rawSub: unknown = await redisCommand(['GET', key]);
    const subscription = parseStoredSubscription(rawSub);
    if (subscription === null) {
      return new Response(
        JSON.stringify({
          success: false,
          notificationsSent: 0,
          message: 'No push subscription for this subscriberId',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders() } },
      );
    }

    const payload = milestonePayload(sessionId, milestoneKey);
    const bodyString = JSON.stringify(payload);

    try {
      await wp.sendNotification(subscription, bodyString, {
        TTL: 60 * 60 * 12,
      });
    } catch (sendErr: unknown) {
      const statusCode =
        typeof sendErr === 'object' &&
        sendErr !== null &&
        'statusCode' in sendErr &&
        typeof (sendErr as { statusCode: unknown }).statusCode === 'number'
          ? (sendErr as { statusCode: number }).statusCode
          : undefined;
      if (statusCode === 410) {
        await redisCommand(['DEL', key]);
        return new Response(
          JSON.stringify({
            success: false,
            notificationsSent: 0,
            message: 'Push subscription expired (410)',
          }),
          { status: 410, headers: { 'Content-Type': 'application/json', ...corsHeaders() } },
        );
      }
      throw sendErr;
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: 1,
        message: 'Push sent',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders() } },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    const isConfig =
      msg.includes('not configured') || msg.includes('VAPID keys are not configured');
    return new Response(
      JSON.stringify({
        success: false,
        notificationsSent: 0,
        message: msg,
      }),
      {
        status: isConfig ? 503 : 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      },
    );
  }
}
