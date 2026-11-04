import type { RequestHandler } from 'express';
import { CORS_ORIGINS, IS_PRODUCTION } from '../config';

function isSameHost(origin: string, host: string | undefined): boolean {
  if (!host) {
    return false;
  }
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Для запросов, меняющих данные: браузер обязан прислать Origin, и он должен
 * совпадать с нашим хостом или быть в allowlist. Закрывает CSRF на multipart-
 * загрузке, которую нельзя защитить preflight-ом CORS.
 */
export function originCheck(allowed: string[] = CORS_ORIGINS): RequestHandler {
  return (req, res, next) => {
    if (!IS_PRODUCTION || req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      next();
      return;
    }

    const origin = req.get('origin');
    if (!origin || allowed.includes(origin) || isSameHost(origin, req.get('host'))) {
      next();
      return;
    }

    res.status(403).json({ message: 'Запрос с недопустимого источника' });
  };
}
