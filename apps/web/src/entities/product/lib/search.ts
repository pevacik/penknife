import type { Product } from '../model/types';

export function getSearchableText(product: Product): string {
  return [product.title, product.minOrder, product.productionTime, product.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
