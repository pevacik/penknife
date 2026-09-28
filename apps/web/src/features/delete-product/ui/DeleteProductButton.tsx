import { useState } from 'react';
import { useProductStore } from '@/entities/product';
import { Button } from '@/shared/ui/Button';

interface DeleteProductButtonProps {
  productId: string;
  onDeleted?: () => void;
}

export function DeleteProductButton({ productId, onDeleted }: DeleteProductButtonProps) {
  const deleteProduct = useProductStore((state) => state.deleteProduct);
  const [deleting, setDeleting] = useState(false);

  const handleClick = async () => {
    if (!window.confirm('Удалить карточку?')) {
      return;
    }

    setDeleting(true);
    try {
      await deleteProduct(productId);
      onDeleted?.();
    } catch {
      setDeleting(false);
    }
  };

  return (
    <Button variant="danger" onClick={handleClick} disabled={deleting}>
      {deleting ? 'Удаление…' : 'Удалить карточку'}
    </Button>
  );
}
