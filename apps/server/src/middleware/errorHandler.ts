import type { NextFunction, Request, Response } from 'express';

interface ErrorLike extends Error {
  status?: number;
  code?: string;
  type?: string;
}

/** Наружу — короткое сообщение, детали (стек, Prisma) — только в серверный лог. */
export function errorHandler(err: ErrorLike, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  const isMulter = err.name === 'MulterError';
  const status = typeof err.status === 'number' ? err.status : isMulter ? 400 : 500;

  let message = 'Ошибка сервера';

  if (status < 500) {
    if (isMulter && err.code === 'LIMIT_FILE_SIZE') {
      message = 'Файл больше 15 МБ';
    } else if (err.type === 'entity.parse.failed') {
      message = 'Некорректный JSON';
    } else if (err.type === 'entity.too.large') {
      message = 'Тело запроса слишком большое';
    } else {
      message = err.message || 'Некорректный запрос';
    }
  }

  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  }

  res.status(status).json({ message });
}
