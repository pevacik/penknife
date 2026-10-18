import { Router } from 'express';
import {
  addComment,
  addImage,
  createProduct,
  deleteComment,
  deleteCommentImage,
  deleteImage,
  deleteProduct,
  getProductById,
  readAllProducts,
  readProducts,
  updateProduct,
} from '../store/prismaStore';
import { buildListPdf } from '../pdf';

export const productsRouter = Router();

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.filter((item): item is string => typeof item === 'string');
}

function asPositiveInt(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

productsRouter.get('/', async (req, res, next) => {
  try {
    const page = asPositiveInt(req.query.page, 1);
    const limit = asPositiveInt(req.query.limit, 24);
    const result = await readProducts({
      page,
      limit,
      query: asString(req.query.query),
      country:
        req.query.country === 'china' || req.query.country === 'russia'
          ? req.query.country
          : 'all',
      circulation: asString(req.query.circulation),
      maxBudget: asString(req.query.maxBudget),
      make50: req.query.make50 === 'yes' ? 'yes' : 'all',
    });
    res.json({
      items: result.items,
      total: result.total,
      page,
      limit,
      hasMore: page * limit < result.total,
    });
  } catch (err) {
    next(err);
  }
});

productsRouter.get('/all', async (_req, res, next) => {
  try {
    const products = await readAllProducts();
    res.json(products);
  } catch (err) {
    next(err);
  }
});

productsRouter.get('/:id', async (req, res, next) => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(product);
  } catch (err) {
    next(err);
  }
});

productsRouter.post('/export-pdf', async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const rawItems = Array.isArray(body.items) ? body.items : [];
    const items = rawItems
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map((item) => ({
        id: asString(item.id) ?? '',
        comment: asString(item.comment) ?? '',
      }))
      .filter((item) => item.id.length > 0);
    const pdf = await buildListPdf(items);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="list.pdf"');
    res.send(pdf);
  } catch (err) {
    next(err);
  }
});

productsRouter.post('/', async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const product = await createProduct({
      title: asString(body.title),
      price: asNumber(body.price),
      circulation: asString(body.circulation),
      make50: asBoolean(body.make50),
      productionCountry: body.productionCountry === 'china' ? 'china' : 'russia',
      tags: asStringArray(body.tags),
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
      price: asNumber(body.price),
      circulation: asString(body.circulation),
      make50: asBoolean(body.make50),
      productionCountry:
        body.productionCountry === 'china' || body.productionCountry === 'russia'
          ? body.productionCountry
          : undefined,
      tags: asStringArray(body.tags),
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
      images: asStringArray(body.images),
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

productsRouter.delete('/:id/comments/:commentId/images/:imageId', async (req, res, next) => {
  try {
    const updated = await deleteCommentImage(
      req.params.id,
      req.params.commentId,
      req.params.imageId,
    );

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
