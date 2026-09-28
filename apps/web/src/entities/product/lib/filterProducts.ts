import type { CountryFilter, Product } from '../model/types';
import { getSearchableText } from './search';

export interface ProductFilterCriteria {
  query: string;
  country: CountryFilter;
  circulation: string;
  maxBudget: string;
}

export function filterProducts(products: Product[], criteria: ProductFilterCriteria): Product[] {
  const query = criteria.query.trim().toLowerCase();
  const circulationLimit = Number.parseInt(criteria.circulation, 10);
  const maxBudget = Number.parseInt(criteria.maxBudget, 10);

  const filtered = products.filter((product) => {
    if (query && !getSearchableText(product).includes(query)) {
      return false;
    }

    if (criteria.country !== 'all' && product.productionCountry !== criteria.country) {
      return false;
    }

    if (!Number.isNaN(circulationLimit)) {
      const circulation = Number.parseInt(product.circulation, 10) || 0;
      if (circulation > circulationLimit) {
        return false;
      }
    }

    if (!Number.isNaN(maxBudget)) {
      if (product.price <= 0 || product.price > maxBudget) {
        return false;
      }
    }

    return true;
  });

  return [...filtered].sort((a, b) => b.price - a.price);
}
