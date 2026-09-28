import { Router } from 'express';
import {
  addComment,
  addImage,
  createProduct,
  deleteComment,
  deleteImage,
  deleteProduct,
  readProducts,
  updateProduct,
} from '../store/fileStore';

export const productsRouter = Router();

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

productsRouter.get('/', async (_req, res, next) => {
  try {
    const products = await readProducts();
    res.json(products);
  } catch (err) {
    next(err);
  }
});

productsRouter.post('/', async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const product = await createProduct({
      title: asString(body.title),
      circulation: asString(body.circulation),
      make50: asBoolean(body.make50),
      productionCountry: body.productionCountry === 'china' ? 'china' : 'russia',
    });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

productsRouter.patch('/:id', async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const updated = await updateProduct(req.params.id, {
      title: asString(body.title),
      circulation: asString(body.circulation),
      make50: asBoolean(body.make50),
      productionCountry:
        body.productionCountry === 'china' || body.productionCountry === 'russia'
          ? body.productionCountry
          : undefined,
    });

    if (!updated) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

productsRouter.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await deleteProduct(req.params.id);

    if (!deleted) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

productsRouter.post('/:id/comments', async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const title = asString(body.title)?.trim();

    if (!title) {
      res.status(400).json({ message: 'Заголовок обязателен' });
      return;
    }

    const updated = await addComment(req.params.id, {
      title,
      text: asString(body.text) ?? '',
    });

    if (!updated) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    res.status(201).json(updated);
  } catch (err) {
    next(err);
  }
});

productsRouter.delete('/:id/comments/:commentId', async (req, res, next) => {
  try {
    const updated = await deleteComment(req.params.id, req.params.commentId);

    if (!updated) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

productsRouter.post('/:id/images', async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const url = asString(body.url)?.trim();

    if (!url) {
      res.status(400).json({ message: 'Ссылка на изображение обязательна' });
      return;
    }

    const updated = await addImage(req.params.id, { url });

    if (!updated) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    res.status(201).json(updated);
  } catch (err) {
    next(err);
  }
});

productsRouter.delete('/:id/images/:imageId', async (req, res, next) => {
  try {
    const updated = await deleteImage(req.params.id, req.params.imageId);

    if (!updated) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});
