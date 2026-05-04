/**
 * Simple health check endpoint with minimal dependencies.
 */

export const config = {
  runtime: 'nodejs',
};

export default async function handler(_request: Request): Promise<Response> {
  return new Response(
    JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
