function asNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'penknife_sid';
export const SESSION_TTL_DAYS = Math.max(1, asNumber(process.env.SESSION_TTL_DAYS, 7));
export const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
/** Как часто обновлять lastUsedAt, чтобы не писать в БД на каждый запрос. */
export const SESSION_TOUCH_INTERVAL_MS = 60 * 60 * 1000;

function parseCookieSecure(value: string | undefined): boolean {
  if (!value || value === 'auto') {
    return IS_PRODUCTION;
  }
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export const COOKIE_SECURE = parseCookieSecure(process.env.COOKIE_SECURE);
export const TRUST_PROXY = Math.max(0, asNumber(process.env.TRUST_PROXY, 0));

export const CORS_ORIGINS = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
