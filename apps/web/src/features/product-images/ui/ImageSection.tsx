import { useRef, useState } from 'react';
import type { ChangeEvent, ClipboardEvent } from 'react';
import { useProductStore } from '@/entities/product';
import type { Product } from '@/entities/product';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { ImageLightbox } from '@/shared/ui/ImageLightbox';
import { readImageFilesFromClipboard } from '@/shared/lib/clipboard';
import { getImageUrl } from '@/shared/lib/imageUrl';
import { importImageFromUrl, uploadImage } from '@/shared/api/uploadImage';
import { useCan } from '@/entities/session';
import { showNoPermissionToast } from '@/shared/lib/toast';
import styles from './ImageSection.module.css';

interface ImageSectionProps {
  product: Product;
}

export function ImageSection({ product }: ImageSectionProps) {
  const addImage = useProductStore((state) => state.addImage);
  const deleteImage = useProductStore((state) => state.deleteImage);
  const canManage = useCan('manageImages');
  const canDeleteImages = useCan('deleteImages');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleFiles = async (files: File[]) => {
    if (!canManage) {
      showNoPermissionToast();
      return;
    }
    if (files.length === 0) {
      return;
    }

    setUploading(true);
    setError(null);
    try {
      for (const file of files) {
        const { url: uploadedUrl } = await uploadImage(file);
        await addImage(product.id, { url: uploadedUrl });
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message ? err.message : 'Не удалось загрузить изображение',
      );
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
    if (!canManage) {
      showNoPermissionToast();
      return;
    }
    const trimmed = url.trim();
    if (!trimmed || importing) {
      return;
    }

    setImporting(true);
    setError(null);
    try {
      const { url: localUrl } = await importImageFromUrl(trimmed);
      await addImage(product.id, { url: localUrl });
      setUrl('');
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Не удалось скачать изображение по ссылке',
      );
    } finally {
      setImporting(false);
    }
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
              <img
                className={styles.thumb}
                src={getImageUrl(image.url, 'thumb')}
                alt=""
                loading="lazy"
                decoding="async"
              />
            </button>
            <button
              type="button"
              className={`${styles.remove} ${canDeleteImages ? '' : styles.inactive}`}
              aria-label="Удалить изображение"
              aria-disabled={!canDeleteImages || undefined}
              onClick={() => {
                if (!canDeleteImages) {
                  showNoPermissionToast();
                  return;
                }
                void deleteImage(product.id, image.id);
              }}
            >
              ×
            </button>
          </div>
        ))}

        <button
          type="button"
          className={`${styles.add} ${canManage ? '' : styles.inactive}`}
          aria-disabled={!canManage || undefined}
          onClick={() => {
            if (!canManage) {
              showNoPermissionToast();
              return;
            }
            fileInputRef.current?.click();
          }}
          disabled={uploading}
        >
          {uploading ? 'Загрузка…' : '+ Загрузить файл'}
        </button>
      </div>

      <>
        <div className={styles.urlRow}>
          <Input
            value={url}
            placeholder="Или вставьте ссылку на изображение"
            disabled={!canManage}
            onChange={(event) => setUrl(event.target.value)}
          />
          <Button
            type="button"
            inactive={!canManage}
            onClick={() => void handleAddUrl()}
            disabled={canManage && (!url.trim() || importing)}
          >
            {importing ? 'Скачивание…' : 'Добавить по ссылке'}
          </Button>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <p className={styles.hint}>
          {canManage
            ? 'Можно вставить изображение из буфера обмена (Ctrl+V)'
            : 'Только просмотр: добавлять и удалять изображения могут администратор и пользователи.'}
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className={styles.hidden}
          onChange={handleFileChange}
        />
      </>

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

