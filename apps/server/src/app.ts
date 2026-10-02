import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { productsRouter } from './routes/products';
import { uploadsRouter } from './routes/uploads';
import { UPLOADS_DIR } from './storage';

function resolveWebDist(): string | null {
  const fromEnv = process.env.WEB_DIST;
  if (fromEnv) {
    return path.resolve(fromEnv);
  }

  const candidate = path.resolve(process.cwd(), '../web/dist');
  return fs.existsSync(path.join(candidate, 'index.html')) ? candidate : null;
}

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/products', productsRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/uploads', express.static(UPLOADS_DIR));

  const webDist = resolveWebDist();
  if (webDist) {
    app.use(express.static(webDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        next();
        return;
      }
      res.sendFile(path.join(webDist, 'index.html'), (err) => {
        if (err) {
          next(err);
        }
      });
    });
  }

  app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status ?? (err.name === 'MulterError' ? 400 : 500);
    res.status(status).json({ message: err.message || 'Ошибка сервера' });
  });

  return app;
}

