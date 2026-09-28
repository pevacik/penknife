import { Button } from '@/shared/ui/Button';
import { useProductStore } from '@/entities/product';
import styles from './AddProductButton.module.css';

export function AddProductButton() {
  const addProduct = useProductStore((state) => state.addProduct);

  return (
    <Button onClick={() => void addProduct()} className={styles.button}>
      <span className={styles.plus} aria-hidden="true">
        +
      </span>
      Добавить карточку
    </Button>
  );
}
