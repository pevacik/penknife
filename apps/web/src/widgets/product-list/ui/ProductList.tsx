import { useEffect } from 'react';
import { filterProducts, ProductCard, useProductStore } from '@/entities/product';
import { useFilterStore } from '@/features/product-filters';
import { useSearchStore } from '@/features/search-products';
import { FavoriteButton } from '@/features/product-selection';
import styles from './ProductList.module.css';

export function ProductList() {
  const products = useProductStore((state) => state.products);
  const loading = useProductStore((state) => state.loading);
  const error = useProductStore((state) => state.error);
  const loadProducts = useProductStore((state) => state.loadProducts);
  const query = useSearchStore((state) => state.query);
  const country = useFilterStore((state) => state.country);
  const circulation = useFilterStore((state) => state.circulation);
  const maxBudget = useFilterStore((state) => state.maxBudget);
  const make50 = useFilterStore((state) => state.make50);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const filtered = filterProducts(products, { query, country, circulation, maxBudget, make50 });

  const hasFilters = Boolean(
    query.trim() || circulation || maxBudget || country !== 'all' || make50 !== 'all',
  );

  return (
    <section className={styles.section}>
      <div className={styles.meta}>{filtered.length} карточек</div>

      {loading ? (
        <div className={styles.state}>Загрузка…</div>
      ) : error ? (
        <div className={styles.state}>Ошибка: {error}</div>
      ) : filtered.length === 0 ? (
        <div className={styles.state}>
          {hasFilters ? 'Ничего не найдено.' : 'Карточек пока нет. Добавьте первую.'}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              action={<FavoriteButton productId={product.id} />}
            />
          ))}
        </div>
      )}
    </section>
  );
}


