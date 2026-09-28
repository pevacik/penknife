import type { Product } from '../model/types';

export function normalizeProduct(product: Product): Product {
  return {
    id: product.id,
    title: product.title ?? '',
    minOrder: product.minOrder ?? '',
    productionTime: product.productionTime ?? '',
    description: product.description ?? '',
    createdAt: product.createdAt ?? '',
  };
}
