import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  CreateCommentPayload,
  CreateImagePayload,
  Product,
  ProductEditableFields,
  UpdateProductPayload,
} from '../types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'products.json');

const DEFAULT_TITLE = 'Новая карточка';

function sanitizeText(value: string | undefined): string {
  return value ? value.trim() : '';
}

function sanitizeDigits(value: string | undefined): string {
  return value ? value.replace(/\D/g, '') : '';
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
    circulation: sanitizeDigits(payload.circulation),
    make50: payload.make50 === true,
    productionCountry: payload.productionCountry === 'china' ? 'china' : 'russia',
    comments: [],
    images: [],
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
    circulation:
      patch.circulation !== undefined ? sanitizeDigits(patch.circulation) : current.circulation,
    make50: patch.make50 !== undefined ? patch.make50 === true : current.make50,
    productionCountry:
      patch.productionCountry === 'china' || patch.productionCountry === 'russia'
        ? patch.productionCountry
        : current.productionCountry,
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

export async function addComment(id: string, payload: CreateCommentPayload): Promise<Product | null> {
  const products = await readProducts();
  const product = products.find((item) => item.id === id);
  if (!product) {
    return null;
  }

  product.comments = [
    ...(product.comments ?? []),
    {
      id: randomUUID(),
      title: payload.title.trim(),
      text: sanitizeText(payload.text),
      createdAt: new Date().toISOString(),
    },
  ];

  await writeProducts(products);
  return product;
}

export async function deleteComment(id: string, commentId: string): Promise<Product | null> {
  const products = await readProducts();
  const product = products.find((item) => item.id === id);
  if (!product) {
    return null;
  }

  product.comments = (product.comments ?? []).filter((comment) => comment.id !== commentId);

  await writeProducts(products);
  return product;
}

export async function addImage(id: string, payload: CreateImagePayload): Promise<Product | null> {
  const products = await readProducts();
  const product = products.find((item) => item.id === id);
  if (!product) {
    return null;
  }

  product.images = [
    ...(product.images ?? []),
    {
      id: randomUUID(),
      url: payload.url.trim(),
    },
  ];

  await writeProducts(products);
  return product;
}

export async function deleteImage(id: string, imageId: string): Promise<Product | null> {
  const products = await readProducts();
  const product = products.find((item) => item.id === id);
  if (!product) {
    return null;
  }

  product.images = (product.images ?? []).filter((image) => image.id !== imageId);

  await writeProducts(products);
  return product;
}
