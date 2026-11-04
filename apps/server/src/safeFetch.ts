import { lookup } from 'node:dns/promises';
import net from 'node:net';
import { httpError } from './httpError';

export const DOWNLOAD_MAX_BYTES = 15 * 1024 * 1024;
export const DOWNLOAD_TIMEOUT_MS = 15_000;

const MAX_REDIRECTS = 5;

export interface DownloadOptions {
  maxBytes?: number;
  timeoutMs?: number;
}

function formatMegabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} МБ`;
}

function isPrivateIPv4(address: string): boolean {
  const parts = address.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b] = parts;

  if (a === 0 || a === 10 || a === 127) return true; // this network / private / loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a === 169 && b === 254) return true; // link-local + cloud metadata (169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true; // private 172.16.0.0/12
  if (a === 192 && b === 168) return true; // private 192.168.0.0/16
  if (a >= 224) return true; // multicast + reserved + broadcast

  return false;
}

function isPrivateIPv6(address: string): boolean {
  const normalized = address.toLowerCase();

  if (normalized === '::' || normalized === '::1') return true;
  if (/^fe[89ab]/.test(normalized)) return true; // link-local fe80::/10
  if (/^f[cd]/.test(normalized)) return true; // unique local fc00::/7
  if (normalized.startsWith('ff')) return true; // multicast

  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) {
    return isPrivateIPv4(mapped[1]);
  }

  const mappedHex = normalized.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const high = parseInt(mappedHex[1], 16);
    const low = parseInt(mappedHex[2], 16);
    return isPrivateIPv4(`${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`);
  }

  return false;
}

function isPrivateAddress(address: string): boolean {
  const version = net.isIP(address);
  if (version === 4) return isPrivateIPv4(address);
  if (version === 6) return isPrivateIPv6(address);
  return true;
}

/**
 * Пропускает только публичные http(s)-адреса: защита от SSRF (loopback, приватные
 * и link-local сети, служебные диапазоны). DNS-rebinding не закрывает — это
 * осознанное ограничение для внутреннего инструмента.
 */
async function assertSafeUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw httpError('Некорректная ссылка на изображение');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw httpError('Поддерживаются только ссылки http:// и https://');
  }

  if (url.username || url.password) {
    throw httpError('Ссылки с логином и паролем не поддерживаются');
  }

  const hostname = url.hostname.replace(/^\[/, '').replace(/\]$/, '').toLowerCase();

  if (!hostname) {
    throw httpError('В ссылке не указан адрес сайта');
  }

  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw httpError('Ссылки на локальную сеть запрещены', 403);
  }

  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw httpError('Ссылки на локальную сеть запрещены', 403);
    }
    return url;
  }

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw httpError('Не удалось определить адрес сайта', 422);
  }

  if (addresses.length === 0) {
    throw httpError('Не удалось определить адрес сайта', 422);
  }

  if (addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw httpError('Ссылки на локальную сеть запрещены', 403);
  }

  return url;
}

function isAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.name === 'AbortError' || error.name === 'TimeoutError';
}

async function readBody(body: NonNullable<Response['body']>, maxBytes: number): Promise<Buffer> {
  const reader = body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (!value) {
        continue;
      }

      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw httpError(`Изображение больше ${formatMegabytes(maxBytes)}`, 413);
      }

      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks);
}

/** Скачивает изображение с проверкой схемы, адреса, редиректов, типа и размера. */
export async function downloadImage(rawUrl: string, options: DownloadOptions = {}): Promise<Buffer> {
  const maxBytes = options.maxBytes ?? DOWNLOAD_MAX_BYTES;
  const timeoutMs = options.timeoutMs ?? DOWNLOAD_TIMEOUT_MS;

  let current = await assertSafeUrl(rawUrl.trim());

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    let response: Response;
    try {
      response = await fetch(current.toString(), {
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { accept: 'image/*' },
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw httpError('Сайт не ответил за отведённое время', 504);
      }
      throw httpError('Не удалось скачать изображение по ссылке', 422);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw httpError('Сайт вернул редирект без адреса', 422);
      }
      if (redirects === MAX_REDIRECTS) {
        throw httpError('Слишком много редиректов', 422);
      }
      current = await assertSafeUrl(new URL(location, current).toString());
      continue;
    }

    if (!response.ok) {
      throw httpError(`Сайт ответил ${response.status}`, 422);
    }

    const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
    // Часть CDN отдаёт картинки как octet-stream — реальный формат всё равно проверит sharp.
    const isImageType =
      contentType.startsWith('image/') || contentType.startsWith('application/octet-stream');
    if (!isImageType) {
      throw httpError('Ссылка ведёт не на изображение', 422);
    }

    const declaredLength = Number(response.headers.get('content-length') ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw httpError(`Изображение больше ${formatMegabytes(maxBytes)}`, 413);
    }

    if (!response.body) {
      throw httpError('Сайт вернул пустой ответ', 422);
    }

    try {
      return await readBody(response.body, maxBytes);
    } catch (error) {
      if (isAbortError(error)) {
        throw httpError('Сайт не ответил за отведённое время', 504);
      }
      throw error;
    }
  }

  throw httpError('Слишком много редиректов', 422);
}
