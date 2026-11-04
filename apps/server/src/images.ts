import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { httpError } from './httpError';
import { downloadImage } from './safeFetch';
import { UPLOADS_DIR } from './storage';

export const IMAGE_VARIANTS = {
  thumb: { width: 480, quality: 72 },
  medium: { width: 1280, quality: 80 },
} as const;

export type ImageVariant = keyof typeof IMAGE_VARIANTS;

const PDF_VARIANT = { width: 1600, quality: 82 };

export const VARIANTS_DIR = path.join(UPLOADS_DIR, '.variants');
export const UPLOADS_URL_PREFIX = '/uploads/';

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'avif']);

const EXTENSION_BY_FORMAT: Record<string, string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
  gif: 'gif',
  avif: 'avif',
};

const FILE_NAME_PATTERN = /^[a-z0-9-]+\.(png|jpe?g|webp|gif|avif)$/i;

const variantJobs = new Map<string, Promise<string>>();

export function isVariant(value: string): value is ImageVariant {
  return Object.prototype.hasOwnProperty.call(IMAGE_VARIANTS, value);
}

/** Достаёт имя файла из `/uploads/<file>`, отклоняя всё, что может выйти за папку. */
export function localFileNameFromUrl(url: string): string | null {
  if (!url.startsWith(UPLOADS_URL_PREFIX)) {
    return null;
  }

  const fileName = url.slice(UPLOADS_URL_PREFIX.length);
  return isSafeFileName(fileName) ? fileName : null;
}

export function isSafeFileName(fileName: string): boolean {
  return FILE_NAME_PATTERN.test(fileName) && path.basename(fileName) === fileName;
}

export function isLocalImageUrl(url: string): boolean {
  return localFileNameFromUrl(url) !== null;
}

export function resolveOriginalPath(fileName: string): string {
  if (!isSafeFileName(fileName)) {
    throw httpError('Некорректное имя изображения', 400);
  }
  return path.join(UPLOADS_DIR, fileName);
}

function baseName(fileName: string): string {
  return path.basename(fileName, path.extname(fileName));
}

export function variantPath(fileName: string, variant: ImageVariant): string {
  return path.join(VARIANTS_DIR, variant, `${baseName(fileName)}.webp`);
}

function pdfPath(fileName: string): string {
  return path.join(VARIANTS_DIR, 'pdf', `${baseName(fileName)}.jpg`);
}

async function writeFileAtomic(target: string, data: Buffer): Promise<void> {
  const directory = path.dirname(target);
  await fs.mkdir(directory, { recursive: true });

  const temp = path.join(directory, `.tmp-${randomUUID()}`);
  await fs.writeFile(temp, data);

  try {
    await fs.rename(temp, target);
  } catch (error) {
    await fs.rm(temp, { force: true });
    throw error;
  }
}

async function readStat(target: string): Promise<{ mtimeMs: number } | null> {
  try {
    const stats = await fs.stat(target);
    return stats.isFile() ? { mtimeMs: stats.mtimeMs } : null;
  } catch {
    return null;
  }
}

async function isFresh(target: string, sourceMtime: number): Promise<boolean> {
  const stats = await readStat(target);
  return stats !== null && stats.mtimeMs >= sourceMtime;
}

async function generateVariant(fileName: string, variant: ImageVariant): Promise<string> {
  const sourcePath = resolveOriginalPath(fileName);
  const source = await readStat(sourcePath);
  if (!source) {
    throw httpError('Изображение не найдено', 404);
  }

  const target = variantPath(fileName, variant);
  if (await isFresh(target, source.mtimeMs)) {
    return target;
  }

  const { width, quality } = IMAGE_VARIANTS[variant];
  const buffer = await sharp(sourcePath)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();

  await writeFileAtomic(target, buffer);
  return target;
}

/**
 * Возвращает путь к варианту, досоздавая его при необходимости.
 * Параллельные запросы одного варианта ждут один и тот же job.
 */
export async function ensureVariant(fileName: string, variant: ImageVariant): Promise<string> {
  resolveOriginalPath(fileName);

  const key = `${variant}/${fileName}`;
  const running = variantJobs.get(key);
  if (running) {
    return running;
  }

  const job = generateVariant(fileName, variant).finally(() => {
    variantJobs.delete(key);
  });

  variantJobs.set(key, job);
  return job;
}

/** JPEG-вариант для PDF: pdfkit не умеет WebP, поэтому конвертируем в JPEG заранее. */
export async function getPdfImageBuffer(fileName: string): Promise<Buffer> {
  const sourcePath = resolveOriginalPath(fileName);
  const source = await readStat(sourcePath);
  if (!source) {
    throw httpError('Изображение не найдено', 404);
  }

  const target = pdfPath(fileName);

  if (!(await isFresh(target, source.mtimeMs))) {
    const buffer = await sharp(sourcePath)
      .rotate()
      .resize({ width: PDF_VARIANT.width, withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: PDF_VARIANT.quality, mozjpeg: true })
      .toBuffer();
    await writeFileAtomic(target, buffer);
  }

  return fs.readFile(target);
}

async function warmVariants(fileName: string): Promise<void> {
  for (const variant of Object.keys(IMAGE_VARIANTS) as ImageVariant[]) {
    try {
      await ensureVariant(fileName, variant);
    } catch (error) {
      // Загрузка не должна падать из-за варианта: его досоздаст /media при первом запросе.
      console.warn(`[images] не удалось создать ${variant} для ${fileName}:`, error);
    }
  }
}

/**
 * Сохраняет картинку локально: определяет реальный формат по содержимому,
 * пишет файл атомарно и сразу прогревает варианты.
 */
export async function saveImageBuffer(buffer: Buffer): Promise<{ url: string; fileName: string }> {
  let format: string | undefined;
  try {
    format = (await sharp(buffer).metadata()).format;
  } catch {
    throw httpError('Файл не является изображением', 422);
  }

  if (!format || !ALLOWED_FORMATS.has(format)) {
    throw httpError('Поддерживаются JPEG, PNG, WebP, GIF и AVIF', 422);
  }

  const fileName = `${randomUUID()}.${EXTENSION_BY_FORMAT[format]}`;
  await writeFileAtomic(path.join(UPLOADS_DIR, fileName), buffer);
  await warmVariants(fileName);

  return { url: `${UPLOADS_URL_PREFIX}${fileName}`, fileName };
}

/** Скачивает картинку по ссылке и сохраняет её локально, возвращая `/uploads/...`. */
export async function importFromUrl(url: string): Promise<string> {
  const buffer = await downloadImage(url);
  const { url: localUrl } = await saveImageBuffer(buffer);
  return localUrl;
}
