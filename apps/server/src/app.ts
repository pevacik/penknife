import express from 'express';
import cors from 'cors';
import { productsRouter } from './routes/products';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/products', productsRouter);

  return app;
}
