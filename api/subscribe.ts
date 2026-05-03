/**
 * Edge Function: POST /api/subscribe
 * Handles Web Push subscription registration for iOS Safari PWA
 *
 * Request body: { subscription: PushSubscription, userId: string }
 * Response: { success: boolean, message?: string }
 */

// Vercel Edge Function handler
export const config = {
  runtime: 'edge',
};

interface SubscriptionRequest {
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  userId: string;
}

interface SubscriptionResponse {
  success: boolean;
  message?: string;
}

/**
 * POST /api/subscribe
 *
 * VAPID Implementation Notes:
 * 1. Client requests Push permission via Notification.requestPermission()
 * 2. If granted, client calls serviceWorkerRegistration.pushManager.subscribe()
 * 3. Server receives PushSubscription { endpoint, keys: { p256dh, auth } }
 * 4. Server stores subscription for later VAPID-signed push delivery
 *
 * Environment Variables Required:
 * - VAPID_PUBLIC_KEY: Shared with client for subscription
 * - VAPID_PRIVATE_KEY: Kept secret, used to sign push messages
 *
 * Future Implementation:
 * - Store subscriptions in Supabase or Upstash Redis (indexed by userId)
 * - Deduplicate subscriptions by endpoint (prevent duplicates on re-subscribe)
 * - Add expiration monitoring (subscriptions can go stale)
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
      JSON.stringify({ success: false, message: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body: SubscriptionRequest = await request.json();
    const { subscription, userId } = body;

    // Validate subscription object
    if (!subscription?.endpoint || !subscription?.keys) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid subscription object' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // TODO: Implementation Steps
    // 1. Connect to Supabase / Upstash Redis
    // 2. Store subscription: { endpoint, p256dh, auth, userId, subscribedAt }
    // 3. Check for existing subscription by endpoint (deduplicate)
    // 4. Return success response

    // Placeholder response (for development)
    console.log(`[subscribe] Received PushSubscription from user: ${userId}`);
    console.log(`[subscribe] Endpoint: ${subscription.endpoint.substring(0, 50)}...`);

    const response: SubscriptionResponse = {
      success: true,
      message: 'Subscription registered (implementation pending)',
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[subscribe] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: `Subscription failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
