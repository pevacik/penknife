import { useEffect, useRef } from 'react';
import { ProductCard, useProductStore } from '@/entities/product';
import type { ProductListParams } from '@/entities/product';
import { useFilterStore } from '@/features/product-filters';
import { useSearchStore } from '@/features/search-products';
import { CartToggleButton } from '@/features/cart';
import { saveHomeScroll, takeHomeScroll } from '@/shared/lib/scroll';
import styles from './ProductList.module.css';

export function ProductList() {
  const products = useProductStore((state) => state.products);
  const total = useProductStore((state) => state.total);
  const page = useProductStore((state) => state.page);
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
  const pendingScroll = useRef<ReturnType<typeof takeHomeScroll>>(null);
  const scrollStateReady = useRef(false);
  const sawLoading = useRef(false);

  const params: ProductListParams = { query, country, circulation, maxBudget, make50 };

  useEffect(() => {
    if (scrollStateReady.current) {
      return;
    }

    pendingScroll.current = takeHomeScroll();
    scrollStateReady.current = true;
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadProducts(params);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, country, circulation, maxBudget, make50]);

  useEffect(() => {
    if (loading) {
      sawLoading.current = true;
      return;
    }
    if (!sawLoading.current) {
      return;
    }

    const pending = pendingScroll.current;
    if (!pending) {
      return;
    }

    if (loadingMore) {
      return;
    }

    if (error) {
      pendingScroll.current = null;
      return;
    }

    if (hasMore && page < pending.page) {
      void loadMore();
      return;
    }

    pendingScroll.current = null;
    requestAnimationFrame(() => {
      window.scrollTo({ top: pending.scrollY, left: 0, behavior: 'auto' });
    });
  }, [loading, loadingMore, page, hasMore, error, loadMore]);

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
                onNavigate={() => saveHomeScroll({ scrollY: window.scrollY, page })}
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


