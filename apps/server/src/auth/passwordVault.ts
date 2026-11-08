import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { PASSWORD_ENCRYPTION_KEY } from '../config';

const ALGORITHM = 'aes-256-gcm';
const VERSION = 'v1';
const IV_LENGTH = 12;

function getKey(): Buffer | null {
  const secret = PASSWORD_ENCRYPTION_KEY.trim();
  if (!secret) {
    return null;
  }

  return createHash('sha256').update(secret, 'utf8').digest();
}

export function isPasswordRevealEnabled(): boolean {
  return getKey() !== null;
}

/**
 * Шифрует пароль для показа администратору. Для входа по-прежнему используется scrypt-хеш.
 * Возвращает null, если ключ не настроен.
 */
export function encryptPassword(password: string): string | null {
  const key = getKey();
  if (!key) {
    return null;
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

export function decryptPassword(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const key = getKey();
  if (!key) {
    return null;
  }

  const [version, rawIv, rawTag, rawEncrypted] = value.split(':');
  if (version !== VERSION || !rawIv || !rawTag || !rawEncrypted) {
    return null;
  }

  try {
    const iv = Buffer.from(rawIv, 'base64');
    const tag = Buffer.from(rawTag, 'base64');
    const encrypted = Buffer.from(rawEncrypted, 'base64');
    if (iv.length !== IV_LENGTH || tag.length === 0 || encrypted.length === 0) {
      return null;
    }

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/** Сохраняет копию пароля для показа; ошибки не должны ломать вход/смену пароля. */
export async function rememberPassword(
  update: (encrypted: string) => Promise<unknown>,
  password: string,
): Promise<void> {
  const encrypted = encryptPassword(password);
  if (!encrypted) {
    return;
  }

  try {
    await update(encrypted);
  } catch (error) {
    console.warn('[password-vault] не удалось сохранить пароль для показа:', error);
  }
}
