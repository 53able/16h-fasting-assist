/**
 * Minimal Upstash Redis REST client using {@link https://developer.mozilla.org/en-US/docs/Web/API/fetch | fetch} only.
 */

/**
 * Runs a single Redis command via Upstash HTTP API.
 *
 * @param command Redis command as argv (e.g. `["GET","key"]`).
 * @returns Parsed JSON body from Upstash (string, number, null, etc.).
 * @throws When env vars are missing or Upstash returns non-2xx.
 */
export const redisCommand = async (
  command: readonly (string | number)[],
): Promise<unknown> => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url === undefined || url === '' || token === undefined || token === '') {
    throw new Error('Upstash Redis is not configured');
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Upstash HTTP ${String(res.status)}: ${text.slice(0, 200)}`);
  }
  if (text === '') {
    return null;
  }
  return JSON.parse(text) as unknown;
};

/**
 * Redis key for a Web Push subscription row.
 *
 * @param subscriberId Client-generated UUID.
 */
export const subscriptionRedisKey = (subscriberId: string): string =>
  `push:sub:${subscriberId}`;
