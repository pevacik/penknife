import { useEffect, useRef } from 'react';
import { ProductCard, useProductStore } from '@/entities/product';
import type { ProductListParams } from '@/entities/product';
import { useFilterStore } from '@/features/product-filters';
import { useSearchStore } from '@/features/search-products';
import { CartToggleButton } from '@/features/cart';
import styles from './ProductList.module.css';

export function ProductList() {
  const products = useProductStore((state) => state.products);
  const total = useProductStore((state) => state.total);
  const loading = useProductStore((state) => state.loading);
  const loadingMore = useProductStore((state) => state.loadingMore);
  const error = useProductStore((state) => state.error);
  const hasMore = useProductStore((state) => state.hasMore);
  const loadProducts = useProductStore((state) => state.loadProducts);
  const loadMore = useProductStore((state) => state.loadMore);

  const query = useSearchStore((state) => state.query);
  const country = useFilterStore((state) => state.country);
  const circulation = useFilterStore((state) => state.circulation);
  const maxBudget = useFilterStore((state) => state.maxBudget);
  const make50 = useFilterStore((state) => state.make50);

  const sentinelRef = useRef<HTMLDivElement>(null);

  const params: ProductListParams = { query, country, circulation, maxBudget, make50 };

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadProducts(params);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, country, circulation, maxBudget, make50]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: '600px 0px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [products.length, hasMore, loadingMore]);

  const hasFilters = Boolean(
    query.trim() || circulation || maxBudget || country !== 'all' || make50 !== 'all',
  );

  return (
    <section className={styles.section}>
      <div className={styles.meta}>{total} карточек</div>

      {loading ? (
        <div className={styles.state}>Загрузка…</div>
      ) : error ? (
        <div className={styles.state}>Ошибка: {error}</div>
      ) : products.length === 0 ? (
        <div className={styles.state}>
          {hasFilters ? 'Ничего не найдено.' : 'Карточек пока нет. Добавьте первую.'}
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                action={<CartToggleButton product={product} />}
              />
            ))}
          </div>
          {loadingMore && <div className={styles.loading}>Загрузка…</div>}
          {!hasMore && <div className={styles.end}>Это все карточки</div>}
        </>
      )}

      <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />
    </section>
  );
}


