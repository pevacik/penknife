import { getProductionCountryLabel } from '@/entities/product';
import type { Product } from '@/entities/product';

export function buildListText(products: Product[]): string {
  return products
    .map((product, index) => {
      const circulation = product.circulation || '—';
      const price = product.price > 0 ? String(product.price) : '—';
      const country = getProductionCountryLabel(product.productionCountry);
      return `${index + 1}. ${product.title} ${circulation} ${price} ${country}`;
    })
    .join('\n');
}
