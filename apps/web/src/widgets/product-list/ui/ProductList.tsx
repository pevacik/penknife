import { useEffect } from 'react';
import { getSearchableText, ProductCard, useProductStore } from '@/entities/product';
import { useSearchStore } from '@/features/search-products';
import styles from './ProductList.module.css';

export function ProductList() {
  const products = useProductStore((state) => state.products);
  const loading = useProductStore((state) => state.loading);
  const error = useProductStore((state) => state.error);
  const loadProducts = useProductStore((state) => state.loadProducts);
  const query = useSearchStore((state) => state.query);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? products.filter((product) => getSearchableText(product).includes(normalizedQuery))
    : products;

  return (
    <section className={styles.section}>
      <div className={styles.meta}>{filtered.length} карточек</div>

      {loading ? (
        <div className={styles.state}>Загрузка…</div>
      ) : error ? (
        <div className={styles.state}>Ошибка: {error}</div>
      ) : filtered.length === 0 ? (
        <div className={styles.state}>
          {query ? 'Ничего не найдено.' : 'Карточек пока нет. Добавьте первую.'}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}

