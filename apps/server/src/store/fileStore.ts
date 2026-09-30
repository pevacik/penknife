import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  CreateCommentPayload,
  CreateImagePayload,
  Product,
  ProductComment,
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

function sanitizePrice(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function sanitizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeComment(raw: ProductComment): ProductComment {
  return {
    id: raw.id,
    title: raw.title ?? '',
    text: raw.text ?? '',
    images: raw.images ?? [],
    createdAt: raw.createdAt ?? '',
  };
}

type LegacyProduct = Product & {
  minOrder?: string;
};

function normalizeProduct(raw: Product): Product {
  const legacy = raw as LegacyProduct;
  return {
    id: raw.id,
    title: raw.title ?? DEFAULT_TITLE,
    price: raw.price ?? 0,
    circulation: raw.circulation ?? legacy.minOrder ?? '',
    make50: raw.make50 ?? false,
    productionCountry: raw.productionCountry === 'china' ? 'china' : 'russia',
    tags: raw.tags ?? [],
    comments: (raw.comments ?? []).map(normalizeComment),
    images: raw.images ?? [],
    createdAt: raw.createdAt ?? '',
  };
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
  return (JSON.parse(raw) as Product[]).map(normalizeProduct);
}

export async function writeProducts(products: Product[]): Promise<void> {
  await ensureFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(products, null, 2), 'utf8');
}

export async function createProduct(payload: Partial<ProductEditableFields> = {}): Promise<Product> {
  const product: Product = {
    id: randomUUID(),
    title: payload.title ? payload.title.trim() : DEFAULT_TITLE,
    price: sanitizePrice(payload.price),
    circulation: sanitizeDigits(payload.circulation),
    make50: payload.make50 === true,
    productionCountry: payload.productionCountry === 'china' ? 'china' : 'russia',
    tags: sanitizeTags(payload.tags),
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
    price: patch.price !== undefined ? sanitizePrice(patch.price) : current.price,
    circulation:
      patch.circulation !== undefined ? sanitizeDigits(patch.circulation) : current.circulation,
    make50: patch.make50 !== undefined ? patch.make50 === true : current.make50,
    productionCountry:
      patch.productionCountry === 'china' || patch.productionCountry === 'russia'
        ? patch.productionCountry
        : current.productionCountry,
    tags: patch.tags !== undefined ? sanitizeTags(patch.tags) : current.tags,
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
      images: (payload.images ?? [])
        .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
        .map((url) => ({ id: randomUUID(), url: url.trim() })),
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

export async function deleteCommentImage(
  id: string,
  commentId: string,
  imageId: string,
): Promise<Product | null> {
  const products = await readProducts();
  const product = products.find((item) => item.id === id);
  if (!product) {
    return null;
  }

  const comment = (product.comments ?? []).find((item) => item.id === commentId);
  if (!comment) {
    return null;
  }

  comment.images = (comment.images ?? []).filter((image) => image.id !== imageId);

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
