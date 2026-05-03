/**
 * Edge Function: POST /api/trigger
 * Triggers Web Push notifications for fasting session milestones
 *
 * Query params: ?sessionId=uuid&delay=seconds (for testing)
 * Request body: { sessionId: string, milestone: 'fat-burn' | 'autophagy' | 'complete' }
 * Response: { success: boolean, notificationsSent: number }
 */

// Vercel Edge Function handler
export const config = {
  runtime: 'edge',
};

interface TriggerRequest {
  sessionId: string;
  milestone?: 'fat-burn' | 'autophagy' | 'complete';
}

interface TriggerResponse {
  success: boolean;
  notificationsSent: number;
  message?: string;
}

/**
 * POST /api/trigger
 *
 * VAPID Push Delivery Notes:
 * 1. Retrieve stored PushSubscriptions for the user
 * 2. For each subscription, sign HTTP POST request using VAPID private key
 * 3. POST to subscription.endpoint with headers:
 *    - Authorization: vapid t=<JWT>, k=<publicKey>
 *    - Content-Encoding: aes128gcm
 *    - Crypto-Key: <encrypted payload headers>
 * 4. Handle subscription expiration (delete stale subscriptions on 410 Gone)
 *
 * Environment Variables Required:
 * - VAPID_PUBLIC_KEY
 * - VAPID_PRIVATE_KEY
 * - SUBJECT (mailto: email for push service admin contact)
 *
 * Testing Milestones:
 * - 10 hours: "脂肪燃焼が始まります"
 * - 14 hours: "オートファジーが活性化"
 * - 16 hours: "目標達成！"
 *
 * iOS Safari Testing Steps:
 * 1. iOS 17+ Safari → Settings → Advanced → Experimental Features (Push API enabled)
 * 2. Open PWA in Safari
 * 3. Grant notification permission
 * 4. POST /api/trigger?sessionId=test&delay=5 (trigger after 5 seconds)
 * 5. Verify notification displays (foreground & background)
 * 6. Repeat with delay=3600 (1 hour) and delay=57600 (16 hours)
 */
export default async function handler(
  request: Request
): Promise<Response> {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, notificationsSent: 0, message: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const delay = url.searchParams.get('delay'); // Testing: trigger after N seconds

    if (!sessionId) {
      return new Response(
        JSON.stringify({
          success: false,
          notificationsSent: 0,
          message: 'Missing sessionId parameter',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body (optional)
    let milestone: string = 'complete';
    if (request.headers.get('content-type')?.includes('application/json')) {
      try {
        const body: TriggerRequest = await request.json();
        if (body.milestone) {
          milestone = body.milestone;
        }
      } catch {
        // Ignore JSON parse errors; use defaults
      }
    }

    // TODO: Implementation Steps
    // 1. Query Supabase for user's PushSubscriptions
    // 2. For each subscription:
    //    a. Create VAPID JWT token
    //    b. Sign push payload with VAPID private key
    //    c. POST to subscription.endpoint with signature headers
    //    d. Handle responses (201 OK, 410 Gone = stale, 429 Rate limited, etc.)
    // 3. Count successful deliveries
    // 4. Return result with sent count

    // Placeholder response (for development)
    console.log(`[trigger] Session: ${sessionId}, Milestone: ${milestone}`);
    if (delay) {
      console.log(`[trigger] Testing: Will trigger after ${delay} seconds`);
    }

    const response: TriggerResponse = {
      success: true,
      notificationsSent: 0, // TODO: Actual count after implementation
      message: 'Trigger queued (VAPID implementation pending)',
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[trigger] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        notificationsSent: 0,
        message: `Trigger failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
