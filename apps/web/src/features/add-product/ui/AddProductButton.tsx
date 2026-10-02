import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { useProductStore } from '@/entities/product';
import styles from './AddProductButton.module.css';

export function AddProductButton() {
  const addProduct = useProductStore((state) => state.addProduct);
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const handleClick = async () => {
    if (creating) {
      return;
    }

    setCreating(true);
    try {
      const created = await addProduct();
      navigate(`/products/${created.id}`);
    } catch {
      // keep the button usable; no card was created
    } finally {
      setCreating(false);
    }
  };

  return (
    <Button onClick={() => void handleClick()} disabled={creating} className={styles.button}>
      <span className={styles.plus} aria-hidden="true">
        +
      </span>
      {creating ? 'Создание…' : 'Добавить карточку'}
    </Button>
  );
}
