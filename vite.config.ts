/**
 * Vite + Vitest root config.
 * Dev server wires /api/subscribe and /api/trigger to the same handlers as Vercel
 * so `pnpm dev` is not 404 on push registration.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import react from '@vitejs/plugin-react';
import type { Plugin, ViteDevServer } from 'vite';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const readRequestBody = (req: IncomingMessage): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer | string) => {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });

const incomingMessageToRequest = (req: IncomingMessage, url: string, body: Buffer): Request => {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      value.forEach((v) => {
        headers.append(key, v);
      });
    } else {
      headers.set(key, value);
    }
  }
  const method = req.method ?? 'GET';
  const hasBody = !['GET', 'HEAD'].includes(method) && body.length > 0;
  const init: RequestInit = {
    method,
    headers,
    body: hasBody ? new Uint8Array(body) : undefined,
  };
  return new Request(url, init);
};

const sendWebResponse = async (res: ServerResponse, webRes: Response): Promise<void> => {
  res.statusCode = webRes.status;
  webRes.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  const buf = Buffer.from(await webRes.arrayBuffer());
  res.end(buf);
};

/**
 * Runs Vercel-style `api/*.ts` default handlers inside the Vite dev server (Node).
 */
const apiDevRoutes = (): Plugin => ({
  name: 'api-dev-routes',
  enforce: 'pre',
  configureServer(server: ViteDevServer) {
    server.middlewares.use(async (req, res, next) => {
      const rawUrl = req.url ?? '';
      if (!rawUrl.startsWith('/api/')) {
        next();
        return;
      }
      let pathname: string;
      try {
        pathname = new URL(rawUrl, 'http://dev.local').pathname;
      } catch {
        next();
        return;
      }
      if (pathname !== '/api/subscribe' && pathname !== '/api/trigger') {
        next();
        return;
      }

      const host = req.headers.host ?? 'localhost';
      const absoluteUrl = `http://${host}${rawUrl}`;

      try {
        const body = await readRequestBody(req);
        const webReq = incomingMessageToRequest(req, absoluteUrl, body);
        const modPath =
          pathname === '/api/subscribe'
            ? path.join(__dirname, 'api/subscribe.ts')
            : path.join(__dirname, 'api/trigger.ts');
        const mod = (await server.ssrLoadModule(modPath)) as {
          default: (r: Request) => Promise<Response>;
        };
        const webRes = await mod.default(webReq);
        await sendWebResponse(res, webRes);
      } catch (err) {
        console.error('[api-dev-routes]', pathname, err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, message: 'Dev API handler error' }));
      }
    });
  },
});

export default defineConfig({
  plugins: [apiDevRoutes(), react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
