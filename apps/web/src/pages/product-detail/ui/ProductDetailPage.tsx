import { useEffect, useLayoutEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useProductStore } from '@/entities/product';
import { useCan } from '@/entities/session';
import { DeleteProductButton } from '@/features/delete-product';
import { ProductForm } from '@/features/edit-product';
import { CommentSection } from '@/features/product-comments';
import { ImageSection } from '@/features/product-images';
import styles from './ProductDetailPage.module.css';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canEdit = useCan('editProduct');
  const product = useProductStore((state) => (id ? state.productsById[id] : undefined));
  const getProduct = useProductStore((state) => state.getProduct);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    if (!id) {
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [id]);

  useEffect(() => {
    if (!id) {
      return;
    }
    let active = true;
    setLoading(true);
    void getProduct(id).finally(() => {
      if (active) {
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [id, getProduct]);

  if (!product) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <div className={styles.state}>
            {loading ? (
              <p>Загрузка…</p>
            ) : (
              <>
                <p>Карточка не найдена.</p>
                <Link to="/" className={styles.link}>
                  ← К списку карточек
                </Link>
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Link to="/" className={styles.back}>
          ← К списку карточек
        </Link>

        <ProductMeta product={product} />

        <ImageSection key={`images-${product.id}`} product={product} />

        <ProductForm key={`form-${product.id}`} product={product} readOnly={!canEdit} />

        <CommentSection product={product} />

        <div className={styles.danger}>
          <DeleteProductButton productId={product.id} onDeleted={() => navigate('/')} />
        </div>
      </main>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ProductMeta({ product }: { product: ReturnType<typeof useProductStore.getState>['productsById'][string] }) {
  const canViewAudit = useCan('viewAudit');

  // Авторство и история карточки — только администратор.
  if (!canViewAudit) {
    return null;
  }

  return (
    <div className={styles.meta}>
      <span>
        Создал: <strong>{product.createdByName || 'неизвестно'}</strong> · {formatDate(product.createdAt)}
      </span>
      {product.updatedByName && (
        <span>
          Изменил: <strong>{product.updatedByName}</strong> · {formatDate(product.updatedAt)}
        </span>
      )}
      <Link to={`/admin/audit?productId=${encodeURIComponent(product.id)}`} className={styles.metaLink}>
        История карточки
      </Link>
    </div>
  );
}

