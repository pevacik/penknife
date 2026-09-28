import type { Product } from '../model/types';

type LegacyProduct = Product & {
  minOrder?: string;
};

export function normalizeProduct(product: Product): Product {
  const legacy = product as LegacyProduct;
  return {
    id: product.id,
    title: product.title ?? '',
    circulation: product.circulation ?? legacy.minOrder ?? '',
    make50: product.make50 ?? false,
    productionCountry: product.productionCountry ?? 'russia',
    comments: product.comments ?? [],
    images: product.images ?? [],
    createdAt: product.createdAt ?? '',
  };
}


