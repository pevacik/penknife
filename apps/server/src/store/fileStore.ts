import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Product, ProductEditableFields, UpdateProductPayload } from '../types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'products.json');

const DEFAULT_TITLE = 'Новая карточка';

function sanitizeText(value: string | undefined): string {
  return value ? value.trim() : '';
}

async function ensureFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, '[]', 'utf8');
  }
}

export async function readProducts(): Promise<Product[]> {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  return JSON.parse(raw) as Product[];
}

export async function writeProducts(products: Product[]): Promise<void> {
  await ensureFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(products, null, 2), 'utf8');
}

export async function createProduct(payload: Partial<ProductEditableFields> = {}): Promise<Product> {
  const product: Product = {
    id: randomUUID(),
    title: payload.title ? payload.title.trim() : DEFAULT_TITLE,
    minOrder: sanitizeText(payload.minOrder),
    productionTime: sanitizeText(payload.productionTime),
    description: sanitizeText(payload.description),
    createdAt: new Date().toISOString(),
  };

  const products = await readProducts();
  products.push(product);
  await writeProducts(products);

  return product;
}

export async function updateProduct(
  id: string,
  patch: UpdateProductPayload,
): Promise<Product | null> {
  const products = await readProducts();
  const index = products.findIndex((product) => product.id === id);
  if (index === -1) {
    return null;
  }

  const current = products[index];
  const updated: Product = {
    ...current,
    title: patch.title !== undefined ? patch.title.trim() || DEFAULT_TITLE : current.title,
    minOrder: patch.minOrder !== undefined ? sanitizeText(patch.minOrder) : current.minOrder,
    productionTime:
      patch.productionTime !== undefined ? sanitizeText(patch.productionTime) : current.productionTime,
    description:
      patch.description !== undefined ? sanitizeText(patch.description) : current.description,
  };

  products[index] = updated;
  await writeProducts(products);

  return updated;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const products = await readProducts();
  const next = products.filter((product) => product.id !== id);

  if (next.length === products.length) {
    return false;
  }

  await writeProducts(next);
  return true;
}
