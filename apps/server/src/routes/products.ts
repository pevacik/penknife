import { Router } from 'express';
import { createProduct, deleteProduct, readProducts, updateProduct } from '../store/fileStore';

export const productsRouter = Router();

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
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
      minOrder: asString(body.minOrder),
      productionTime: asString(body.productionTime),
      description: asString(body.description),
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
      minOrder: asString(body.minOrder),
      productionTime: asString(body.productionTime),
      description: asString(body.description),
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
