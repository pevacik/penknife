import type { Request, Response } from 'express';
import { COOKIE_SECURE, SESSION_COOKIE_NAME } from '../config';

export function parseCookies(header: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};

  if (!header) {
    return result;
  }

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) {
      continue;
    }

    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!name) {
      continue;
    }

    try {
      result[name] = decodeURIComponent(value);
    } catch {
      result[name] = value;
    }
  }

  return result;
}

export function readSessionToken(req: Request): string | null {
  return parseCookies(req.headers.cookie)[SESSION_COOKIE_NAME] ?? null;
}

const BASE_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: COOKIE_SECURE,
  path: '/',
} as const;

export function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(SESSION_COOKIE_NAME, token, { ...BASE_COOKIE_OPTIONS, expires: expiresAt });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, BASE_COOKIE_OPTIONS);
}
