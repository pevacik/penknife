import { useProductStore } from '@/entities/product';
import { Button } from '@/shared/ui/Button';
import { downloadTextFile } from '@/shared/lib/download';
import { buildListText } from '../model/list';
import { useSelectionStore } from '../model/store';
import styles from './DownloadListButton.module.css';

export function DownloadListButton() {
  const products = useProductStore((state) => state.products);
  const selectedIds = useSelectionStore((state) => state.selectedIds);
  const clear = useSelectionStore((state) => state.clear);

  const handleDownload = () => {
    const selected = products.filter((product) => selectedIds.includes(product.id));
    downloadTextFile('list.txt', buildListText(selected), 'text/plain', false);
    clear();
  };

  return (
    <Button
      className={styles.button}
      onClick={handleDownload}
      disabled={selectedIds.length === 0}
    >
      Скачать список
    </Button>
  );
}
