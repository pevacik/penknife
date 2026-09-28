import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { productsRouter } from './routes/products';
import { uploadsRouter } from './routes/uploads';
import { UPLOADS_DIR } from './storage';

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

  app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status ?? (err.name === 'MulterError' ? 400 : 500);
    res.status(status).json({ message: err.message || 'Ошибка сервера' });
  });

  return app;
}
