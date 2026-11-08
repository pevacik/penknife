import type { Product } from '../model/types';

type LegacyProduct = Product & {
  minOrder?: string;
};

export function normalizeProduct(product: Product): Product {
  const legacy = product as LegacyProduct;
  return {
    id: product.id,
    title: product.title ?? '',
    price: product.price ?? 0,
    circulation: product.circulation ?? legacy.minOrder ?? '',
    make50: product.make50 ?? false,
    productionCountry: product.productionCountry ?? 'russia',
    tags: product.tags ?? [],
    comments: (product.comments ?? []).map((comment) => ({
      ...comment,
      authorId: comment.authorId ?? null,
      authorName: comment.authorName ?? '',
      updatedById: comment.updatedById ?? null,
      updatedByName: comment.updatedByName ?? null,
      updatedAt: comment.updatedAt ?? null,
      images: comment.images ?? [],
    })),
    images: product.images ?? [],
    createdById: product.createdById ?? null,
    createdByName: product.createdByName ?? null,
    updatedById: product.updatedById ?? null,
    updatedByName: product.updatedByName ?? null,
    createdAt: product.createdAt ?? '',
    updatedAt: product.updatedAt ?? product.createdAt ?? '',
  };
}


