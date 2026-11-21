import { useEffect, useLayoutEffect, useRef } from 'react';
import { ProductCard, useProductStore } from '@/entities/product';
import type { ProductListParams } from '@/entities/product';
import { useAuthStore } from '@/entities/session';
import { useFilterStore } from '@/features/product-filters';
import { useSearchStore } from '@/features/search-products';
import { CartToggleButton } from '@/features/cart';
import { saveHomeScroll, takeHomeScroll } from '@/shared/lib/scroll';
import styles from './ProductList.module.css';

function paramsKey(params: ProductListParams): string {
  return JSON.stringify({
    query: params.query ?? '',
    country: params.country ?? 'all',
    circulation: params.circulation ?? '',
    maxBudget: params.maxBudget ?? '',
    make50: params.make50 ?? 'all',
  });
}

export function ProductList() {
  const products = useProductStore((state) => state.products);
  const total = useProductStore((state) => state.total);
  const page = useProductStore((state) => state.page);
  const loading = useProductStore((state) => state.loading);
  const loadingMore = useProductStore((state) => state.loadingMore);
  const error = useProductStore((state) => state.error);
  const hasMore = useProductStore((state) => state.hasMore);
  const currentParams = useProductStore((state) => state.currentParams);
  const loadedForUserId = useProductStore((state) => state.loadedForUserId);
  const loadProducts = useProductStore((state) => state.loadProducts);
  const loadMore = useProductStore((state) => state.loadMore);
  const currentUserId = useAuthStore((state) => state.user?.id);

  const query = useSearchStore((state) => state.query);
  const country = useFilterStore((state) => state.country);
  const circulation = useFilterStore((state) => state.circulation);
  const maxBudget = useFilterStore((state) => state.maxBudget);
  const make50 = useFilterStore((state) => state.make50);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const pendingScroll = useRef<ReturnType<typeof takeHomeScroll>>(null);
  const pendingReady = useRef(false);

  const params: ProductListParams = { query, country, circulation, maxBudget, make50 };
  const requestKey = paramsKey(params);
  const loadedKey = paramsKey(currentParams);
  const userMismatch = products.length > 0 && loadedForUserId !== currentUserId;
  const canReuse = products.length > 0 && !userMismatch && loadedKey === requestKey;

  useEffect(() => {
    if (canReuse) {
      return;
    }

    const timeout = setTimeout(() => {
      void loadProducts(params, currentUserId);
    }, 300);
    return () => clearTimeout(timeout);
  }, [requestKey, currentUserId, canReuse, loadProducts]);

  useLayoutEffect(() => {
    if (!pendingReady.current) {
      pendingScroll.current = takeHomeScroll();
      pendingReady.current = true;
    }

    const pending = pendingScroll.current;
    if (!pending || loading || userMismatch) {
      return;
    }

    if (loadingMore) {
      return;
    }

    if (error) {
      pendingScroll.current = null;
      return;
    }

    const card = pending.productId
      ? document.querySelector<HTMLElement>(`[data-product-id="${pending.productId}"]`)
      : null;

    if (card) {
      const cardTop = card.getBoundingClientRect().top + window.scrollY;
      const target = Math.max(0, cardTop + (pending.offset ?? 0));
      window.scrollTo({ top: target, left: 0, behavior: 'auto' });
      pendingScroll.current = null;
      return;
    }

    if (pending.productId && hasMore && page < pending.page) {
      void loadMore();
      return;
    }

    pendingScroll.current = null;
    window.scrollTo({ top: pending.scrollY, left: 0, behavior: 'auto' });
  }, [loading, loadingMore, products.length, page, hasMore, error, userMismatch, loadMore]);

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

  const showLoading = loading || userMismatch;

  return (
    <section className={styles.section}>
      <div className={styles.meta}>{total} карточек</div>

      {showLoading ? (
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
                onNavigate={(element) => {
                  const rect = element.getBoundingClientRect();
                  const absoluteTop = rect.top + window.scrollY;
                  saveHomeScroll({
                    productId: product.id,
                    scrollY: window.scrollY,
                    page,
                    offset: window.scrollY - absoluteTop,
                  });
                }}
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


