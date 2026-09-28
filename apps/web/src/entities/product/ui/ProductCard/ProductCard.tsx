import { Link } from 'react-router-dom';
import type { Product } from '../../model/types';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const cover = product.images[0]?.url;

  return (
    <Link to={`/products/${product.id}`} className={styles.card}>
      <div className={styles.image}>
        {cover ? <img className={styles.img} src={cover} alt="" /> : null}
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>{product.title}</h3>
        <span className={styles.date}>
          {new Date(product.createdAt).toLocaleDateString('ru-RU')}
        </span>
      </div>
    </Link>
  );
}


