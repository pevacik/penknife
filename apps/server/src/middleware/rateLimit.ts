import type { RequestHandler } from 'express';

interface FailureEntry {
  failures: number;
  resetAt: number;
}

class FailureLimiter {
  private readonly entries = new Map<string, FailureEntry>();

  constructor(
    private readonly maxFailures: number,
    private readonly windowMs: number,
  ) {
    const timer = setInterval(() => this.prune(), 10 * 60 * 1000);
    timer.unref();
  }

  retryAfterMs(key: string): number {
    const entry = this.entries.get(key);
    if (!entry) {
      return 0;
    }
    if (entry.resetAt <= Date.now()) {
      this.entries.delete(key);
      return 0;
    }
    return entry.failures >= this.maxFailures ? entry.resetAt - Date.now() : 0;
  }

  fail(key: string): void {
    const now = Date.now();
    const entry = this.entries.get(key);

    if (!entry || entry.resetAt <= now) {
      this.entries.set(key, { failures: 1, resetAt: now + this.windowMs });
      return;
    }

    entry.failures += 1;
  }

  reset(key: string): void {
    this.entries.delete(key);
  }

  private prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) {
        this.entries.delete(key);
      }
    }
  }
}

/** Пять неудачных попыток входа на IP+логин за 15 минут. */
export const loginRateLimit = new FailureLimiter(5, 15 * 60 * 1000);

/** Пять неудачных попыток смены пароля на IP+пользователя за 15 минут. */
export const passwordChangeRateLimit = new FailureLimiter(5, 15 * 60 * 1000);

interface HitEntry {
  count: number;
  resetAt: number;
}

/**
 * Простой in-memory лимитер: корректен для одного процесса.
 * Несколько инстансов потребуют общего хранилища (Redis).
 */
export function apiRateLimit(maxRequests = 300, windowMs = 60_000): RequestHandler {
  const hits = new Map<string, HitEntry>();

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) {
        hits.delete(key);
      }
    }
  }, 60_000);
  timer.unref();

  return (req, res, next) => {
    const key = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    entry.count += 1;
    if (entry.count > maxRequests) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      res.status(429).json({ message: 'Слишком много запросов. Попробуйте позже.' });
      return;
    }

    next();
  };
}
