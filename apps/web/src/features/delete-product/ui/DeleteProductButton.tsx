import { useState } from 'react';
import { useCan } from '@/entities/session';
import { useProductStore } from '@/entities/product';
import { Button } from '@/shared/ui/Button';
import { showNoPermissionToast } from '@/shared/lib/toast';

interface DeleteProductButtonProps {
  productId: string;
  onDeleted?: () => void;
}

export function DeleteProductButton({ productId, onDeleted }: DeleteProductButtonProps) {
  const canDelete = useCan('deleteProduct');
  const deleteProduct = useProductStore((state) => state.deleteProduct);
  const [deleting, setDeleting] = useState(false);

  const handleClick = async () => {
    if (!canDelete) {
      showNoPermissionToast();
      return;
    }
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
    <Button variant="danger" onClick={handleClick} disabled={deleting} inactive={!canDelete}>
      {deleting ? 'Удаление…' : 'Удалить карточку'}
    </Button>
  );
}
