import type { MouseEvent } from 'react';
import { useSelectionStore } from '../model/store';
import styles from './FavoriteButton.module.css';

interface FavoriteButtonProps {
  productId: string;
}

export function FavoriteButton({ productId }: FavoriteButtonProps) {
  const isSelected = useSelectionStore((state) => state.selectedIds.includes(productId));
  const toggle = useSelectionStore((state) => state.toggle);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    toggle(productId);
  };

  return (
    <button
      type="button"
      className={`${styles.heart} ${isSelected ? styles.heartSelected : ''}`}
      aria-label={isSelected ? 'Убрать из списка' : 'Добавить в список'}
      aria-pressed={isSelected}
      onClick={handleClick}
    >
      {isSelected ? '♥' : '♡'}
    </button>
  );
}
