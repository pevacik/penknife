import os from 'node:os';
import { createApp } from './app';

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

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
  for (const address of getLanAddresses()) {
    console.log(`[server] network:     http://${address}:${PORT}`);
  }
});
