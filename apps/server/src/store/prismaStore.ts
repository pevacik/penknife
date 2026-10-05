import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import type {
  CreateCommentPayload,
  CreateImagePayload,
  ListProductsQuery,
  Product,
  ProductEditableFields,
  ProductListResult,
  ProductionCountry,
  UpdateProductPayload,
} from '../types';

const DEFAULT_TITLE = 'Новая карточка';

const productWithRelations = Prisma.validator<Prisma.ProductDefaultArgs>()({
  include: {
    images: true,
    comments: { include: { images: true } },
  },
});

type ProductWithRelations = Prisma.ProductGetPayload<typeof productWithRelations>;

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

function isNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}

interface LightProduct {
  id: string;
  title: string;
  price: number;
  circulation: string;
  make50: boolean;
  productionCountry: string;
  tags: string[];
  comments: Array<{ title: string; text: string }>;
}

const COUNTRY_LABEL: Record<ProductionCountry, string> = {
  russia: 'Россия',
  china: 'Китай',
};

function getSearchableText(product: LightProduct): string {
  const commentsText = product.comments
    .map((comment) => `${comment.title} ${comment.text}`)
    .join(' ');
  const tagsText = product.tags.join(' ');

  return [
    product.title,
    product.circulation,
    COUNTRY_LABEL[product.productionCountry as ProductionCountry] ?? product.productionCountry,
    tagsText,
    commentsText,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function matchesFilters(product: LightProduct, query: ListProductsQuery): boolean {
  const search = (query.query ?? '').trim().toLowerCase();
  if (search && !getSearchableText(product).includes(search)) {
    return false;
  }

  if (query.country === 'china' || query.country === 'russia') {
    if (product.productionCountry !== query.country) {
      return false;
    }
  }

  if (query.make50 === 'yes' && !product.make50) {
    return false;
  }

  const circulationLimit = Number.parseInt(query.circulation ?? '', 10);
  if (!Number.isNaN(circulationLimit)) {
    const circulation = Number.parseInt(product.circulation, 10) || 0;
    if (circulation > circulationLimit) {
      return false;
    }
  }

  const maxBudget = Number.parseInt(query.maxBudget ?? '', 10);
  if (!Number.isNaN(maxBudget)) {
    if (product.price <= 0 || product.price > maxBudget) {
      return false;
    }
  }

  return true;
}

function serializeProduct(product: ProductWithRelations): Product {
  return {
    id: product.id,
    title: product.title,
    price: product.price,
    circulation: product.circulation,
    make50: product.make50,
    productionCountry: product.productionCountry === 'china' ? 'china' : 'russia',
    tags: product.tags,
    images: product.images.map((image) => ({ id: image.id, url: image.url })),
    comments: product.comments.map((comment) => ({
      id: comment.id,
      title: comment.title,
      text: comment.text,
      images: comment.images.map((image) => ({ id: image.id, url: image.url })),
      createdAt: comment.createdAt.toISOString(),
    })),
    createdAt: product.createdAt.toISOString(),
  };
}

async function fetchProduct(id: string): Promise<Product | null> {
  const product = await prisma.product.findUnique({
    ...productWithRelations,
    where: { id },
  });
  return product ? serializeProduct(product) : null;
}

export async function readProducts(query: ListProductsQuery = {}): Promise<ProductListResult> {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const limit = Math.max(1, Math.min(100, Math.floor(query.limit ?? 24)));

  const rows = await prisma.product.findMany({
    select: {
      id: true,
      title: true,
      price: true,
      circulation: true,
      make50: true,
      productionCountry: true,
      tags: true,
      comments: { select: { title: true, text: true } },
    },
  });

  const filtered = rows.filter((row) => matchesFilters(row, query));
  const sorted = filtered.sort((a, b) => b.price - a.price);
  const total = sorted.length;
  const pageIds = sorted.slice((page - 1) * limit, page * limit).map((row) => row.id);

  const items = await prisma.product.findMany({
    ...productWithRelations,
    where: { id: { in: pageIds } },
    orderBy: { price: 'desc' },
  });

  return { items: items.map(serializeProduct), total };
}

export async function readAllProducts(): Promise<Product[]> {
  const products = await prisma.product.findMany({
    ...productWithRelations,
    orderBy: { createdAt: 'asc' },
  });
  return products.map(serializeProduct);
}

export async function getProductById(id: string): Promise<Product | null> {
  return fetchProduct(id);
}

export async function createProduct(payload: Partial<ProductEditableFields> = {}): Promise<Product> {
  const product = await prisma.product.create({
    ...productWithRelations,
    data: {
      title: payload.title ? payload.title.trim() : DEFAULT_TITLE,
      price: sanitizePrice(payload.price),
      circulation: sanitizeDigits(payload.circulation),
      make50: payload.make50 === true,
      productionCountry: payload.productionCountry === 'china' ? 'china' : 'russia',
      tags: sanitizeTags(payload.tags),
    },
  });
  return serializeProduct(product);
}

export async function updateProduct(
  id: string,
  patch: UpdateProductPayload,
): Promise<Product | null> {
  const data: Prisma.ProductUpdateInput = {};

  if (patch.title !== undefined) {
    data.title = patch.title.trim() || DEFAULT_TITLE;
  }
  if (patch.price !== undefined) {
    data.price = sanitizePrice(patch.price);
  }
  if (patch.circulation !== undefined) {
    data.circulation = sanitizeDigits(patch.circulation);
  }
  if (patch.make50 !== undefined) {
    data.make50 = patch.make50 === true;
  }
  if (patch.productionCountry === 'china' || patch.productionCountry === 'russia') {
    data.productionCountry = patch.productionCountry;
  }
  if (patch.tags !== undefined) {
    data.tags = sanitizeTags(patch.tags);
  }

  if (Object.keys(data).length === 0) {
    return fetchProduct(id);
  }

  try {
    const product = await prisma.product.update({
      where: { id },
      data,
      ...productWithRelations,
    });
    return serializeProduct(product);
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }
    throw error;
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  try {
    await prisma.product.delete({ where: { id } });
    return true;
  } catch (error) {
    if (isNotFound(error)) {
      return false;
    }
    throw error;
  }
}

export async function addComment(
  id: string,
  payload: CreateCommentPayload,
): Promise<Product | null> {
  const existing = await fetchProduct(id);
  if (!existing) {
    return null;
  }

  await prisma.comment.create({
    data: {
      title: payload.title.trim(),
      text: sanitizeText(payload.text),
      productId: id,
      images: {
        create: (payload.images ?? [])
          .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
          .map((url) => ({ url: url.trim() })),
      },
    },
  });

  return fetchProduct(id);
}

export async function deleteComment(id: string, commentId: string): Promise<Product | null> {
  const existing = await fetchProduct(id);
  if (!existing) {
    return null;
  }

  await prisma.comment.deleteMany({ where: { id: commentId, productId: id } });

  return fetchProduct(id);
}

export async function addImage(id: string, payload: CreateImagePayload): Promise<Product | null> {
  const existing = await fetchProduct(id);
  if (!existing) {
    return null;
  }

  await prisma.productImage.create({
    data: { url: payload.url.trim(), productId: id },
  });

  return fetchProduct(id);
}

export async function deleteImage(id: string, imageId: string): Promise<Product | null> {
  const existing = await fetchProduct(id);
  if (!existing) {
    return null;
  }

  await prisma.productImage.deleteMany({ where: { id: imageId, productId: id } });

  return fetchProduct(id);
}

export async function deleteCommentImage(
  id: string,
  commentId: string,
  imageId: string,
): Promise<Product | null> {
  const existing = await fetchProduct(id);
  if (!existing) {
    return null;
  }

  await prisma.commentImage.deleteMany({
    where: { id: imageId, commentId, comment: { productId: id } },
  });

  return fetchProduct(id);
}
