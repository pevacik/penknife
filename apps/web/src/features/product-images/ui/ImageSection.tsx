import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useProductStore } from '@/entities/product';
import type { Product } from '@/entities/product';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { uploadImage } from '../api';
import styles from './ImageSection.module.css';

interface ImageSectionProps {
  product: Product;
}

export function ImageSection({ product }: ImageSectionProps) {
  const addImage = useProductStore((state) => state.addImage);
  const deleteImage = useProductStore((state) => state.deleteImage);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      await addImage(product.id, { url });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddUrl = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      return;
    }
    await addImage(product.id, { url: trimmed });
    setUrl('');
  };

  return (
    <div className={styles.section}>
      <h2 className={styles.heading}>Изображения</h2>

      <div className={styles.list}>
        {product.images.map((image) => (
          <div key={image.id} className={styles.item}>
            <img className={styles.thumb} src={image.url} alt="" />
            <button
              type="button"
              className={styles.remove}
              aria-label="Удалить изображение"
              onClick={() => void deleteImage(product.id, image.id)}
            >
              ×
            </button>
          </div>
        ))}

        <button
          type="button"
          className={styles.add}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Загрузка…' : '+ Загрузить файл'}
        </button>
      </div>

      <div className={styles.urlRow}>
        <Input
          value={url}
          placeholder="Или вставьте ссылку на изображение"
          onChange={(event) => setUrl(event.target.value)}
        />
        <Button type="button" onClick={() => void handleAddUrl()} disabled={!url.trim()}>
          Добавить по ссылке
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className={styles.hidden}
        onChange={handleFileChange}
      />
    </div>
  );
}
