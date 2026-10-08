import type { MouseEvent } from 'react';
import type { Product } from '@/entities/product';
import { useCartStore } from '../model/store';
import styles from './CartToggleButton.module.css';

interface CartToggleButtonProps {
  product: Product;
}

export function CartToggleButton({ product }: CartToggleButtonProps) {
  const inCart = useCartStore((state) => state.items.some((item) => item.id === product.id));
  const add = useCartStore((state) => state.add);
  const remove = useCartStore((state) => state.remove);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (inCart) {
      remove(product.id);
    } else {
      add({ id: product.id, title: product.title, imageUrl: product.images[0]?.url ?? '' });
    }
  };

  return (
    <button
      type="button"
      className={`${styles.toggle} ${inCart ? styles.toggleActive : ''}`}
      aria-label={inCart ? 'Убрать из корзины' : 'Добавить в корзину'}
      aria-pressed={inCart}
      onClick={handleClick}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    </button>
  );
}
