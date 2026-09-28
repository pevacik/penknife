import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useProductStore } from '@/entities/product';
import { DeleteProductButton } from '@/features/delete-product';
import { ProductForm } from '@/features/edit-product';
import { CommentSection } from '@/features/product-comments';
import { ImageSection } from '@/features/product-images';
import styles from './ProductDetailPage.module.css';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const products = useProductStore((state) => state.products);
  const loading = useProductStore((state) => state.loading);
  const loadProducts = useProductStore((state) => state.loadProducts);

  useEffect(() => {
    if (products.length === 0) {
      void loadProducts();
    }
  }, [products.length, loadProducts]);

  const product = products.find((item) => item.id === id);

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

        <ImageSection key={`images-${product.id}`} product={product} />

        <ProductForm key={`form-${product.id}`} product={product} />

        <CommentSection product={product} />

        <div className={styles.danger}>
          <DeleteProductButton productId={product.id} onDeleted={() => navigate('/')} />
        </div>
      </main>
    </div>
  );
}

