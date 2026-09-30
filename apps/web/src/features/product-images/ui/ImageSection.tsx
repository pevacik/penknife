import { useRef, useState } from 'react';
import type { ChangeEvent, ClipboardEvent } from 'react';
import { useProductStore } from '@/entities/product';
import type { Product } from '@/entities/product';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { ImageLightbox } from '@/shared/ui/ImageLightbox';
import { readImageFilesFromClipboard } from '@/shared/lib/clipboard';
import { uploadImage } from '@/shared/api/uploadImage';
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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    setUploading(true);
    try {
      for (const file of files) {
        const { url: uploadedUrl } = await uploadImage(file);
        await addImage(product.id, { url: uploadedUrl });
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    void handleFiles(files);
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const files = readImageFilesFromClipboard(event);
    if (files.length === 0) {
      return;
    }
    event.preventDefault();
    void handleFiles(files);
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
    <div className={styles.section} onPaste={handlePaste}>
      <h2 className={styles.heading}>Изображения</h2>

      <div className={styles.list}>
        {product.images.map((image, index) => (
          <div key={image.id} className={styles.item}>
            <button
              type="button"
              className={styles.thumbButton}
              onClick={() => setLightboxIndex(index)}
              aria-label="Открыть изображение"
            >
              <img className={styles.thumb} src={image.url} alt="" />
            </button>
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

      <p className={styles.hint}>Можно вставить изображение из буфера обмена (Ctrl+V)</p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className={styles.hidden}
        onChange={handleFileChange}
      />

      {lightboxIndex !== null && (
        <ImageLightbox
          images={product.images}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}

