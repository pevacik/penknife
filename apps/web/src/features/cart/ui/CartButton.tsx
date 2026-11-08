import { useState } from 'react';
import { useCartStore } from '../model/store';
import { productApi } from '@/entities/product/api/productApi';
import { useCan } from '@/entities/session';
import { downloadBlob } from '@/shared/lib/download';
import { showNoPermissionToast } from '@/shared/lib/toast';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { CartIcon } from './CartIcon';
import { getImageUrl } from '@/shared/lib/imageUrl';
import styles from './CartButton.module.css';

export function CartButton() {
  const canExport = useCan('exportPdf');
  const items = useCartStore((state) => state.items);
  const remove = useCartStore((state) => state.remove);
  const setComment = useCartStore((state) => state.setComment);
  const clear = useCartStore((state) => state.clear);
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!canExport) {
      showNoPermissionToast();
      return;
    }
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
              inactive={!canExport}
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
                      <img
                        className={styles.thumb}
                        src={getImageUrl(item.imageUrl, 'thumb')}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
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
