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
 * POST /api/trigger?sessionId={sessionId}&milestone={milestone}
 *
 * Retries up to MAX_RETRIES times with exponential backoff.
 * On final failure, calls fallbackCallback with the milestone message so the
 * caller can surface an in-app banner.
 *
 * @returns The final Response on success, or null if all retries failed.
 */
export async function triggerNotification(
  sessionId: string,
  milestone: MilestoneLabel,
  fallbackCallback?: FallbackCallback,
): Promise<Response | null> {
  const url = `/api/trigger?sessionId=${encodeURIComponent(sessionId)}&milestone=${encodeURIComponent(milestone)}`;

  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(BASE_DELAY_MS * Math.pow(2, attempt - 1));
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, milestone }),
      });

      if (response.ok) {
        return response;
      }

      // Non-retriable client errors (4xx except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        break;
      }

      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
  }

  // All attempts failed – trigger fallback banner
  if (fallbackCallback !== undefined) {
    fallbackCallback(MILESTONE_MESSAGES[milestone]);
  }

  console.error('[api-client] triggerNotification failed after retries:', lastError);
  return null;
}
