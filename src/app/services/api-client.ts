/**
 * API Client
 * Sends POST requests to /api/trigger to deliver milestone push notifications.
 * Includes exponential-backoff retry logic and in-app banner fallback.
 */

export type MilestoneLabel = '10-hour' | '16-hour';

/** Callback invoked when all retries are exhausted so the UI can show a banner. */
export type FallbackCallback = (message: string) => void;

const MILESTONE_MESSAGES: Record<MilestoneLabel, string> = {
  '10-hour': '脂肪燃焼がスタート！内臓脂肪の分解が活発化中...',
  '16-hour': 'オートファジー発動！細胞の再生が始まった！',
};

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

/**
 * Sleep for the given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST /api/trigger with sessionId, subscriberId, milestone (query + JSON body).
 *
 * Retries up to MAX_RETRIES times with exponential backoff.
 * On final failure, calls fallbackCallback with the milestone message so the
 * caller can surface an in-app banner.
 *
 * @param subscriberId - Server looks up PushSubscription; empty skips HTTP and uses fallback only
 * @returns The final Response on success, or null if all retries failed.
 */
export const triggerNotification = async (
  sessionId: string,
  subscriberId: string,
  milestone: MilestoneLabel,
  fallbackCallback?: FallbackCallback,
): Promise<Response | null> => {
  if (subscriberId === '') {
    if (fallbackCallback !== undefined) {
      fallbackCallback(MILESTONE_MESSAGES[milestone]);
    }
    return null;
  }

  const url = `/api/trigger?sessionId=${encodeURIComponent(sessionId)}&subscriberId=${encodeURIComponent(subscriberId)}&milestone=${encodeURIComponent(milestone)}`;

  const errors: unknown[] = [];

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(BASE_DELAY_MS * Math.pow(2, attempt - 1));
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, subscriberId, milestone }),
      });

      if (response.ok) {
        return response;
      }

      // Non-retriable client errors (4xx except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        break;
      }

      errors.push(new Error(`HTTP ${response.status}`));
    } catch (error) {
      errors.push(error);
    }
  }

  // All attempts failed – trigger fallback banner
  if (fallbackCallback !== undefined) {
    fallbackCallback(MILESTONE_MESSAGES[milestone]);
  }

  console.error('[api-client] triggerNotification failed after retries:', errors[errors.length - 1]);
  return null;
};
