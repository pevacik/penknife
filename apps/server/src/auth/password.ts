import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type { ScryptOptions } from 'node:crypto';

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const MAX_PASSWORD_LENGTH = 200;

function normalizePassword(password: string): string {
  return password.normalize('NFKC');
}

function derive(password: string, salt: Buffer, keyLength: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey);
    });
  });
}

/** Формат: `scrypt$N$r$p$<saltBase64>$<hashBase64>`. */
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 1 || password.length > MAX_PASSWORD_LENGTH) {
    throw new Error('Недопустимая длина пароля');
  }

  const salt = randomBytes(SALT_LENGTH);
  const hash = await derive(normalizePassword(password), salt, KEY_LENGTH, SCRYPT_PARAMS);

  return [
    'scrypt',
    SCRYPT_PARAMS.N,
    SCRYPT_PARAMS.r,
    SCRYPT_PARAMS.p,
    salt.toString('base64'),
    hash.toString('base64'),
  ].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!password || password.length > MAX_PASSWORD_LENGTH) {
    return false;
  }

  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return false;
  }

  const [, rawN, rawR, rawP, rawSalt, rawHash] = parts;
  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);

  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p) || N <= 0 || r <= 0 || p <= 0) {
    return false;
  }

  const salt = Buffer.from(rawSalt, 'base64');
  const expected = Buffer.from(rawHash, 'base64');
  if (salt.length === 0 || expected.length === 0) {
    return false;
  }

  try {
    const actual = await derive(normalizePassword(password), salt, expected.length, {
      N,
      r,
      p,
      maxmem: SCRYPT_PARAMS.maxmem,
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
