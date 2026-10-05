import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useProductStore } from '@/entities/product';
import type { CreateProductPayload } from '@/entities/product';
import { productApi } from '@/entities/product/api/productApi';
import { Button } from '@/shared/ui/Button';
import { downloadTextFile } from '@/shared/lib/download';
import { csvToProducts, productsToCsv } from '../model/converter';
import styles from './CsvMenu.module.css';

export function CsvMenu() {
  const total = useProductStore((state) => state.total);
  const addProduct = useProductStore((state) => state.addProduct);
  const updateProduct = useProductStore((state) => state.updateProduct);
  const addImage = useProductStore((state) => state.addImage);
  const addComment = useProductStore((state) => state.addComment);
  const loadProducts = useProductStore((state) => state.loadProducts);

  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    const all = await productApi.listAll();
    downloadTextFile('products.csv', productsToCsv(all));
    setOpen(false);
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setImporting(true);
    setMessage(null);
    try {
      const text = await file.text();
      const rows = csvToProducts(text);
      let created = 0;
      let updated = 0;

      for (const row of rows) {
        const payload: CreateProductPayload = {
          title: row.title,
          price: row.price,
          circulation: row.circulation,
          make50: row.make50,
          productionCountry: row.productionCountry,
          tags: row.tags,
        };

        const existing = row.id ? await productApi.get(row.id) : null;

        if (existing) {
          await updateProduct(row.id, payload);
          updated += 1;
        } else {
          const createdProduct = await addProduct(payload);
          for (const url of row.images) {
            await addImage(createdProduct.id, { url });
          }
          for (const comment of row.comments) {
            await addComment(createdProduct.id, comment);
          }
          created += 1;
        }
      }

      await loadProducts();

      setMessage(`Импортировано: создано ${created}, обновлено ${updated}`);
    } catch {
      setMessage('Не удалось импортировать CSV');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className={styles.trigger}>
        CSV
      </Button>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <h3 className={styles.heading}>Импорт / Экспорт CSV</h3>

            <div className={styles.actions}>
              <Button onClick={() => void handleExport()} disabled={total === 0}>
                Экспортировать CSV
              </Button>
              <Button onClick={() => fileInputRef.current?.click()} disabled={importing}>
                {importing ? 'Импорт…' : 'Импортировать CSV'}
              </Button>
            </div>

            {message && <p className={styles.message}>{message}</p>}

            <Button variant="ghost" onClick={() => setOpen(false)}>
              Закрыть
            </Button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className={styles.hidden}
        onChange={handleImportFile}
      />
    </>
  );
}
