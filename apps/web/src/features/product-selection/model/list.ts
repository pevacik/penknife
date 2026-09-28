import type { Product, ProductionCountry } from '@/entities/product';

const COUNTRY_TERM: Record<ProductionCountry, string> = {
  russia: '25 рабочих дней',
  china: '2 месяца',
};

export function buildListText(products: Product[]): string {
  return products
    .map((product, index) => {
      const circulation = product.circulation ? `${product.circulation} шт` : '—';
      const price = product.price > 0 ? `${product.price} ₽` : '—';
      const term = COUNTRY_TERM[product.productionCountry];
      return `${index + 1}. ${product.title} ${circulation} ${price} ${term}`;
    })
    .join('\n');
}

