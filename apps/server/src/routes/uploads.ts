import { Router } from 'express';
import multer from 'multer';
import { importFromUrl, saveImageBuffer } from '../images';
import { requirePermission } from '../middleware/requirePermission';
import { DOWNLOAD_MAX_BYTES } from '../safeFetch';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: DOWNLOAD_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
      return;
    }
    cb(Object.assign(new Error('Можно загружать только изображения'), { status: 400 }));
  },
});

export const uploadsRouter = Router();

uploadsRouter.post('/', requirePermission('manageImages'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Файл не загружен' });
      return;
    }

    const { url } = await saveImageBuffer(req.file.buffer);
    res.status(201).json({ url });
  } catch (error) {
    next(error);
  }
});

uploadsRouter.post('/from-url', requirePermission('manageImages'), async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const url = typeof body.url === 'string' ? body.url.trim() : '';

    if (!url) {
      res.status(400).json({ message: 'Ссылка на изображение обязательна' });
      return;
    }

    const localUrl = await importFromUrl(url);
    res.status(201).json({ url: localUrl });
  } catch (error) {
    next(error);
  }
});

