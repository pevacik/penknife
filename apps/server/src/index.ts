import os from 'node:os';
import { cleanupExpiredSessions } from './auth/session';
import { createApp } from './app';

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '127.0.0.1';

function getLanAddresses(): string[] {
  const result: string[] = [];
  const interfaces = os.networkInterfaces();

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        result.push(entry.address);
      }
    }
  }

  return result;
}

const app = createApp();

app.listen(PORT, HOST, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);

  if (HOST === '0.0.0.0' || HOST === '::') {
    for (const address of getLanAddresses()) {
      console.log(`[server] network:     http://${address}:${PORT}`);
    }
  }
});

void cleanupExpiredSessions().catch((error) => {
  console.warn('[auth] не удалось очистить сессии:', error instanceof Error ? error.message : error);
});

const cleanupTimer = setInterval(() => {
  void cleanupExpiredSessions().catch(() => undefined);
}, 60 * 60 * 1000);
cleanupTimer.unref();
