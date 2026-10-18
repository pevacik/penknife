import type { MouseEvent } from 'react';
import type { Product } from '@/entities/product';
import { getProductionTerm } from '@/entities/product';
import { useCartStore } from '../model/store';
import { CartIcon } from './CartIcon';
import styles from './CartToggleButton.module.css';

function buildDefaultComment(product: Product): string {
  const parts: string[] = [];
  parts.push(`Цена от ${product.price.toLocaleString('ru-RU')} ₽`);
  if (product.circulation) {
    parts.push(`Тираж от ${product.circulation}`);
  }
  parts.push(`Срок: ${getProductionTerm(product.productionCountry)}`);
  return parts.join(' · ');
}

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
      add({
        id: product.id,
        title: product.title,
        imageUrl: product.images[0]?.url ?? '',
        comment: buildDefaultComment(product),
      });
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
      <CartIcon size={18} />
    </button>
  );
}
