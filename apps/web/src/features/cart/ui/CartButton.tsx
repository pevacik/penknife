import { useState } from 'react';
import { useCartStore } from '../model/store';
import { productApi } from '@/entities/product/api/productApi';
import { downloadBlob } from '@/shared/lib/download';
import { Button } from '@/shared/ui/Button';
import styles from './CartButton.module.css';

export function CartButton() {
  const items = useCartStore((state) => state.items);
  const remove = useCartStore((state) => state.remove);
  const clear = useCartStore((state) => state.clear);
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (items.length === 0 || downloading) {
      return;
    }
    setDownloading(true);
    try {
      const blob = await productApi.exportPdf(items.map((item) => item.id));
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
        <svg
          width="20"
          height="20"
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
        {items.length > 0 && <span className={styles.badge}>{items.length}</span>}
      </button>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.header}>
              <h3 className={styles.heading}>Корзина</h3>
              <button
                type="button"
                className={styles.close}
                onClick={() => setOpen(false)}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            {items.length === 0 ? (
              <p className={styles.empty}>Корзина пуста</p>
            ) : (
              <ul className={styles.list}>
                {items.map((item) => (
                  <li key={item.id} className={styles.item}>
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
                  </li>
                ))}
              </ul>
            )}

            <div className={styles.actions}>
              <Button
                className={styles.download}
                onClick={() => void handleDownload()}
                disabled={items.length === 0 || downloading}
              >
                {downloading ? 'Генерация…' : 'Скачать список'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
