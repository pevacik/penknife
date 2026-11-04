import { Router } from 'express';
import { ensureVariant, isSafeFileName, isVariant, resolveOriginalPath } from '../images';

const PRIVATE_CACHE_CONTROL = 'private, max-age=31536000, immutable';
const FALLBACK_CACHE_CONTROL = 'private, max-age=3600';

export const mediaRouter = Router();

/**
 * GET /media/:variant/:file — производные размеры картинки.
 * Вариант создаётся лениво при первом запросе и отдаётся с immutable-кэшем.
 */
mediaRouter.get('/:variant/:file', async (req, res, next) => {
  const { variant, file } = req.params;

  if (!isVariant(variant) || !isSafeFileName(file)) {
    res.status(400).json({ message: 'Некорректный адрес изображения' });
    return;
  }

  try {
    const target = await ensureVariant(file, variant);
    res.setHeader('Cache-Control', PRIVATE_CACHE_CONTROL);
    res.sendFile(target, { cacheControl: false }, (error) => {
      if (error) {
        next(error);
      }
    });
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 404) {
      res.status(404).json({ message: 'Изображение не найдено' });
      return;
    }

    console.warn(`[media] не удалось подготовить ${variant} для ${file}:`, error);

    // Если конвертация не удалась (экзотический формат) — отдаём оригинал как есть.
    res.setHeader('Cache-Control', FALLBACK_CACHE_CONTROL);
    res.sendFile(resolveOriginalPath(file), { cacheControl: false }, (fallbackError) => {
      if (fallbackError) {
        next(fallbackError);
      }
    });
  }
});
