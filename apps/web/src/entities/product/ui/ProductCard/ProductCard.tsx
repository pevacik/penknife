import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Product } from '../../model/types';
import { getImageUrl } from '@/shared/lib/imageUrl';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
  action?: ReactNode;
  onNavigate?: () => void;
}

export function ProductCard({ product, action, onNavigate }: ProductCardProps) {
  const cover = product.images[0]?.url;

  return (
    <Link to={`/products/${product.id}`} className={styles.card} onClick={onNavigate}>
      <div className={styles.image}>
        {cover ? (
          <img
            className={styles.img}
            src={getImageUrl(cover, 'thumb')}
            alt=""
            loading="lazy"
            decoding="async"
          />
        ) : null}
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>{product.title}</h3>
        <div className={styles.priceRow}>
          <span className={styles.price}>
            {product.price > 0 ? `${product.price.toLocaleString('ru-RU')} ₽` : '—'}
          </span>
          {action}
        </div>
      </div>
    </Link>
  );
}




