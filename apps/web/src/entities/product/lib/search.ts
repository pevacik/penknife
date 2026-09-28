import type { Product } from '../model/types';
import { getProductionCountryLabel } from '../model/fields';

export function getSearchableText(product: Product): string {
  const commentsText = product.comments
    .map((comment) => `${comment.title} ${comment.text}`)
    .join(' ');

  const tagsText = product.tags.join(' ');

  return [
    product.title,
    product.circulation,
    getProductionCountryLabel(product.productionCountry),
    tagsText,
    commentsText,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

