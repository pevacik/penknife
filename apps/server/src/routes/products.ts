import { Router } from 'express';
import {
  addComment,
  addImage,
  createProduct,
  deleteComment,
  deleteCommentImage,
  deleteImage,
  deleteProduct,
  getComment,
  getProductById,
  readAllProducts,
  readProducts,
  updateComment,
  updateProduct,
} from '../store/prismaStore';
import { buildListPdf } from '../pdf';
import { httpError } from '../httpError';
import { importFromUrl, isLocalImageUrl } from '../images';
import { recordAudit } from '../audit/record';
import type { Product } from '../types';
import { requirePermission } from '../middleware/requirePermission';

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

/** Внешние ссылки скачиваются на сервер: в БД должны попадать только локальные URL. */
async function toLocalImageUrl(url: string): Promise<string> {
  const trimmed = url.trim();

  if (!trimmed) {
    throw httpError('Ссылка на изображение обязательна');
  }

  if (isLocalImageUrl(trimmed)) {
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return importFromUrl(trimmed);
  }

  throw httpError('Ссылка должна вести на изображение: /uploads/… или http(s)://…');
}

async function importCommentImages(urls: string[]): Promise<string[]> {
  const images: string[] = [];

  for (const url of urls) {
    const trimmed = url.trim();
    if (!trimmed) {
      continue;
    }

    try {
      images.push(await toLocalImageUrl(trimmed));
    } catch (error) {
      // Одна битая ссылка не должна терять весь комментарий (актуально для CSV).
      console.warn(
        '[products] изображение комментария пропущено:',
        trimmed,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return images;
}

function productSnapshot(product: Product) {
  return {
    title: product.title,
    price: product.price,
    circulation: product.circulation,
    make50: product.make50,
    productionCountry: product.productionCountry,
    tags: product.tags,
  };
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

productsRouter.get('/all', requirePermission('csv'), async (_req, res, next) => {
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

productsRouter.post('/export-pdf', requirePermission('exportPdf'), async (req, res, next) => {
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

productsRouter.post('/', requirePermission('createProduct'), async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const product = await createProduct(
      {
        title: asString(body.title),
        price: asNumber(body.price),
        circulation: asString(body.circulation),
        make50: asBoolean(body.make50),
        productionCountry: body.productionCountry === 'china' ? 'china' : 'russia',
        tags: asStringArray(body.tags),
      },
      req.user,
    );

    await recordAudit(req, {
      action: 'product.create',
      entityType: 'product',
      entityId: product.id,
      productId: product.id,
      title: product.title,
      details: { price: product.price, productionCountry: product.productionCountry },
    });

    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

productsRouter.patch('/:id', requirePermission('editProduct'), async (req, res, next) => {
  try {
    const before = await getProductById(req.params.id);
    if (!before) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const updated = await updateProduct(
      req.params.id,
      {
        title: asString(body.title),
        price: asNumber(body.price),
        circulation: asString(body.circulation),
        make50: asBoolean(body.make50),
        productionCountry:
          body.productionCountry === 'china' || body.productionCountry === 'russia'
            ? body.productionCountry
            : undefined,
        tags: asStringArray(body.tags),
      },
      req.user,
    );

    if (!updated) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    await recordAudit(req, {
      action: 'product.update',
      entityType: 'product',
      entityId: updated.id,
      productId: updated.id,
      title: updated.title,
      details: { before: productSnapshot(before), after: productSnapshot(updated) },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

productsRouter.delete('/:id', requirePermission('deleteProduct'), async (req, res, next) => {
  try {
    const before = await getProductById(req.params.id);
    if (!before) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    const deleted = await deleteProduct(req.params.id);
    if (!deleted) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    await recordAudit(req, {
      action: 'product.delete',
      entityType: 'product',
      entityId: before.id,
      productId: before.id,
      title: before.title,
      details: {
        snapshot: productSnapshot(before),
        images: before.images.length,
        comments: before.comments.length,
      },
    });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

productsRouter.post('/:id/comments', requirePermission('manageComments'), async (req, res, next) => {
  try {
    const author = req.user;
    if (!author) {
      res.status(401).json({ message: 'Требуется вход' });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const title = asString(body.title)?.trim();

    if (!title) {
      res.status(400).json({ message: 'Заголовок обязателен' });
      return;
    }

    const result = await addComment(
      req.params.id,
      {
        title,
        text: asString(body.text) ?? '',
        images: await importCommentImages(asStringArray(body.images) ?? []),
      },
      { id: author.id, username: author.username },
    );

    if (!result) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    await recordAudit(req, {
      action: 'comment.create',
      entityType: 'comment',
      entityId: result.commentId,
      productId: req.params.id,
      title,
      details: { title, text: asString(body.text) ?? '' },
    });

    res.status(201).json(result.product);
  } catch (err) {
    next(err);
  }
});

productsRouter.patch('/:id/comments/:commentId', requirePermission('manageComments'), async (req, res, next) => {
  try {
    const actor = req.user;
    if (!actor) {
      res.status(401).json({ message: 'Требуется вход' });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const title = asString(body.title)?.trim();

    if (!title) {
      res.status(400).json({ message: 'Заголовок обязателен' });
      return;
    }

    const comment = await getComment(req.params.id, req.params.commentId);
    if (!comment) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    const updated = await updateComment(
      req.params.id,
      req.params.commentId,
      {
        title,
        text: asString(body.text) ?? '',
      },
      actor,
    );

    if (!updated) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    await recordAudit(req, {
      action: 'comment.update',
      entityType: 'comment',
      entityId: comment.id,
      productId: req.params.id,
      title,
      details: {
        before: { title: comment.title, text: comment.text },
        after: { title, text: asString(body.text) ?? '' },
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

productsRouter.delete('/:id/comments/:commentId', requirePermission('deleteComments'), async (req, res, next) => {
  try {
    const comment = await getComment(req.params.id, req.params.commentId);
    if (!comment) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    const updated = await deleteComment(req.params.id, req.params.commentId);

    if (!updated) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    await recordAudit(req, {
      action: 'comment.delete',
      entityType: 'comment',
      entityId: comment.id,
      productId: req.params.id,
      title: comment.title,
      details: {
        snapshot: { title: comment.title, text: comment.text, author: comment.authorName },
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

productsRouter.delete('/:id/comments/:commentId/images/:imageId', requirePermission('deleteImages'), async (req, res, next) => {
  try {
    const comment = await getComment(req.params.id, req.params.commentId);
    if (!comment) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    const updated = await deleteCommentImage(
      req.params.id,
      req.params.commentId,
      req.params.imageId,
    );

    if (!updated) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    await recordAudit(req, {
      action: 'comment.image.delete',
      entityType: 'image',
      entityId: req.params.imageId,
      productId: req.params.id,
      title: comment.title,
      details: { commentId: comment.id, imageId: req.params.imageId },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

productsRouter.post('/:id/images', requirePermission('manageImages'), async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const url = asString(body.url)?.trim();

    if (!url) {
      res.status(400).json({ message: 'Ссылка на изображение обязательна' });
      return;
    }

    const localUrl = await toLocalImageUrl(url);
    const updated = await addImage(req.params.id, { url: localUrl });

    if (!updated) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    await recordAudit(req, {
      action: 'product.image.add',
      entityType: 'image',
      productId: req.params.id,
      title: updated.title,
      details: { url: localUrl },
    });

    res.status(201).json(updated);
  } catch (err) {
    next(err);
  }
});

productsRouter.delete('/:id/images/:imageId', requirePermission('deleteImages'), async (req, res, next) => {
  try {
    const updated = await deleteImage(req.params.id, req.params.imageId);

    if (!updated) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    await recordAudit(req, {
      action: 'product.image.delete',
      entityType: 'image',
      entityId: req.params.imageId,
      productId: req.params.id,
      title: updated.title,
      details: { imageId: req.params.imageId },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});
