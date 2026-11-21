import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useCan } from '@/entities/session';
import { useProductStore } from '@/entities/product';
import type { CreateProductPayload } from '@/entities/product';
import { productApi } from '@/entities/product/api/productApi';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { downloadTextFile } from '@/shared/lib/download';
import { showNoPermissionToast } from '@/shared/lib/toast';
import { csvToProducts, productsToCsv } from '../model/converter';
import styles from './CsvMenu.module.css';

export function CsvMenu() {
  const canExportCsv = useCan('csv');
  const canImportCsv = useCan('csvImport');
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
    if (!canExportCsv) {
      showNoPermissionToast();
      return;
    }

    const all = await productApi.listAll();
    downloadTextFile('products.csv', productsToCsv(all));
    setOpen(false);
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!canImportCsv) {
      showNoPermissionToast();
      event.target.value = '';
      return;
    }

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
      let skipped = 0;

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
            try {
              await addImage(createdProduct.id, { url });
            } catch {
              // Битая ссылка не должна ронять весь импорт.
              skipped += 1;
            }
          }
          for (const comment of row.comments) {
            try {
              await addComment(createdProduct.id, comment);
            } catch {
              skipped += 1;
            }
          }
          created += 1;
        }
      }

      await loadProducts();

      setMessage(
        `Импортировано: создано ${created}, обновлено ${updated}${
          skipped > 0 ? `, пропущено: ${skipped}` : ''
        }`,
      );
    } catch {
      setMessage('Не удалось импортировать CSV');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleOpen = () => {
    if (!canExportCsv && !canImportCsv) {
      showNoPermissionToast();
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <Button onClick={handleOpen} inactive={!canExportCsv && !canImportCsv} className={styles.trigger}>
        CSV
      </Button>

      {open && (
        <Modal
          title="Импорт / Экспорт CSV"
          onClose={() => setOpen(false)}
          actions={
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Закрыть
            </Button>
          }
        >
          <div className={styles.actions}>
            <Button
              onClick={() => void handleExport()}
              disabled={canExportCsv && total === 0}
              inactive={!canExportCsv}
            >
              Экспортировать CSV
            </Button>
            <Button
              onClick={() => {
                if (!canImportCsv) {
                  showNoPermissionToast();
                  return;
                }
                fileInputRef.current?.click();
              }}
              disabled={importing}
              inactive={!canImportCsv}
            >
              {importing ? 'Импорт…' : 'Импортировать CSV'}
            </Button>
          </div>

          {message && <p className={styles.message}>{message}</p>}
        </Modal>
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
