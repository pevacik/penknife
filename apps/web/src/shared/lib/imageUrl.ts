import { API_URL } from '@/shared/config/env';

export type ImageVariant = 'thumb' | 'medium' | 'original';

const UPLOADS_PREFIX = '/uploads/';
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');
const EXTERNAL_URL_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

function withOrigin(pathname: string): string {
  return API_ORIGIN ? `${API_ORIGIN}${pathname}` : pathname;
}

/**
 * Превращает локальный `/uploads/<file>` в URL нужного варианта (`/media/<variant>/<file>`).
 * Внешние и уже готовые URL возвращаются как есть; при абсолютном `VITE_API_URL`
 * подставляется origin бэкенда.
 */
export function getImageUrl(url: string, variant: ImageVariant = 'original'): string {
  if (!url) {
    return '';
  }

  if (EXTERNAL_URL_PATTERN.test(url) || !url.startsWith(UPLOADS_PREFIX)) {
    return withOrigin(url);
  }

  if (variant === 'original') {
    return withOrigin(url);
  }

  const fileName = url.slice(UPLOADS_PREFIX.length);
  if (!fileName) {
    return withOrigin(url);
  }

  return withOrigin(`/media/${variant}/${fileName}`);
}
