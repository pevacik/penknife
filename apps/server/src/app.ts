import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { CORS_ORIGINS, TRUST_PROXY } from './config';
import { errorHandler } from './middleware/errorHandler';
import { originCheck } from './middleware/originCheck';
import { apiRateLimit } from './middleware/rateLimit';
import { requireAuth } from './middleware/requireAuth';
import { securityHeaders } from './middleware/securityHeaders';
import { authRouter } from './routes/auth';
import { mediaRouter } from './routes/media';
import { productsRouter } from './routes/products';
import { uploadsRouter } from './routes/uploads';
import { usersRouter } from './routes/users';
import { UPLOADS_DIR } from './storage';

const STATIC_MAX_AGE = '365d';
const PRIVATE_CACHE_CONTROL = 'private, max-age=31536000, immutable';

function requestId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.get('x-request-id');
  const id = incoming && incoming.length <= 100 ? incoming : randomUUID();
  res.setHeader('X-Request-Id', id);
  next();
}

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

  app.disable('x-powered-by');
  if (TRUST_PROXY > 0) {
    app.set('trust proxy', TRUST_PROXY);
  }

  app.use(securityHeaders);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || CORS_ORIGINS.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(requestId);
  app.use(originCheck());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);

  // Всё остальное под /api требует сессию и ограничено по частоте запросов.
  app.use('/api', apiRateLimit());
  app.use('/api', requireAuth);

  app.use('/api/products', productsRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/users', usersRouter);

  // Картинки закрыты тем же входом; кэш — приватный, только в браузере пользователя.
  app.use('/media', requireAuth, mediaRouter);
  app.use(
    '/uploads',
    requireAuth,
    express.static(UPLOADS_DIR, {
      // .variants — внутренний кэш, наружу он не отдаётся.
      dotfiles: 'ignore',
      setHeaders: (res) => {
        res.setHeader('Cache-Control', PRIVATE_CACHE_CONTROL);
      },
    }),
  );

  const webDist = resolveWebDist();
  if (webDist) {
    // Файлы Vite содержат хэш в имени — их можно кэшировать навсегда.
    app.use(
      '/assets',
      express.static(path.join(webDist, 'assets'), {
        maxAge: STATIC_MAX_AGE,
        immutable: true,
      }),
    );
    app.use(
      express.static(webDist, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      }),
    );
    app.get('*', (req, res, next) => {
      if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/uploads') ||
        req.path.startsWith('/media')
      ) {
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

  app.use(errorHandler);

  return app;
}

