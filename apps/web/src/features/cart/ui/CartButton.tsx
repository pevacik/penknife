import { useState } from 'react';
import { useCartStore } from '../model/store';
import { productApi } from '@/entities/product/api/productApi';
import { downloadBlob } from '@/shared/lib/download';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { CartIcon } from './CartIcon';
import styles from './CartButton.module.css';

export function CartButton() {
  const items = useCartStore((state) => state.items);
  const remove = useCartStore((state) => state.remove);
  const setComment = useCartStore((state) => state.setComment);
  const clear = useCartStore((state) => state.clear);
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (items.length === 0 || downloading) {
      return;
    }
    setDownloading(true);
    try {
      const blob = await productApi.exportPdf(
        items.map((item) => ({ id: item.id, comment: item.comment ?? '' })),
      );
      downloadBlob(blob, 'list.pdf');
      clear();
    } catch {
      // keep the items so the user can retry
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
        aria-label="Открыть корзину"
      >
        <CartIcon size={20} />
        {items.length > 0 && <span className={styles.badge}>{items.length}</span>}
      </button>

      {open && (
        <Modal
          title="Корзина"
          onClose={() => setOpen(false)}
          actions={
            <Button
              className={styles.download}
              onClick={() => void handleDownload()}
              disabled={items.length === 0 || downloading}
            >
              {downloading ? 'Генерация…' : 'Скачать список'}
            </Button>
          }
        >
          {items.length === 0 ? (
            <p className={styles.empty}>Корзина пуста</p>
          ) : (
            <ul className={styles.list}>
              {items.map((item) => (
                <li key={item.id} className={styles.item}>
                  <div className={styles.itemRow}>
                    {item.imageUrl ? (
                      <img className={styles.thumb} src={item.imageUrl} alt="" />
                    ) : (
                      <span className={styles.thumbEmpty} />
                    )}
                    <span className={styles.title}>{item.title}</span>
                    <button
                      type="button"
                      className={styles.remove}
                      onClick={() => remove(item.id)}
                      aria-label="Удалить из корзины"
                    >
                      ×
                    </button>
                  </div>
                  <textarea
                    className={styles.commentInput}
                    value={item.comment ?? ''}
                    placeholder="Комментарий (цена, тираж, срок)"
                    onChange={(event) => setComment(item.id, event.target.value)}
                  />
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </>
  );
}
