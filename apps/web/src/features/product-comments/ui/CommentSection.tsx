import { useRef, useState } from 'react';
import type { ChangeEvent, ClipboardEvent, FormEvent } from 'react';
import { useProductStore } from '@/entities/product';
import type { Product, ProductImage } from '@/entities/product';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { ImageLightbox } from '@/shared/ui/ImageLightbox';
import { readImageFilesFromClipboard } from '@/shared/lib/clipboard';
import { uploadImage } from '@/shared/api/uploadImage';
import styles from './CommentSection.module.css';

interface CommentSectionProps {
  product: Product;
}

interface LightboxState {
  images: ProductImage[];
  index: number;
}

export function CommentSection({ product }: CommentSectionProps) {
  const addComment = useProductStore((state) => state.addComment);
  const deleteComment = useProductStore((state) => state.deleteComment);
  const deleteCommentImage = useProductStore((state) => state.deleteCommentImage);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const { url } = await uploadImage(file);
        urls.push(url);
      }
      setImages((prev) => [...prev, ...urls]);
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

  const handlePaste = (event: ClipboardEvent<HTMLFormElement>) => {
    const files = readImageFilesFromClipboard(event);
    if (files.length === 0) {
      return;
    }
    event.preventDefault();
    void handleFiles(files);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }

    setSaving(true);
    try {
      await addComment(product.id, {
        title: title.trim(),
        text: text.trim(),
        images,
      });
      setTitle('');
      setText('');
      setImages([]);
    } catch {
      // keep the form so the user can retry
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Комментарии</h2>

      <form className={styles.form} onSubmit={handleSubmit} onPaste={handlePaste}>
        <Input
          value={title}
          placeholder="Заголовок"
          onChange={(event) => setTitle(event.target.value)}
        />
        <Textarea
          value={text}
          placeholder="Комментарий"
          onChange={(event) => setText(event.target.value)}
        />

        {images.length > 0 && (
          <div className={styles.previewList}>
            {images.map((url, index) => (
              <div key={`${url}-${index}`} className={styles.previewItem}>
                <img className={styles.previewImage} src={url} alt="" />
                <button
                  type="button"
                  className={styles.previewRemove}
                  aria-label="Убрать изображение"
                  onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={styles.formActions}>
          <Button type="submit" disabled={saving || !title.trim()}>
            {saving ? 'Сохранение…' : 'Сохранить комментарий'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Загрузка…' : 'Прикрепить изображение'}
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
      </form>

      {product.comments.length === 0 ? (
        <p className={styles.empty}>Комментариев пока нет.</p>
      ) : (
        <ul className={styles.list}>
          {product.comments.map((comment) => (
            <li key={comment.id} className={styles.item}>
              <div className={styles.itemHeader}>
                <h3 className={styles.itemTitle}>{comment.title}</h3>
                <button
                  type="button"
                  className={styles.delete}
                  onClick={() => void deleteComment(product.id, comment.id)}
                >
                  Удалить
                </button>
              </div>
              {comment.text && <p className={styles.itemText}>{comment.text}</p>}

              {comment.images.length > 0 && (
                <div className={styles.images}>
                  {comment.images.map((image, index) => (
                    <div key={image.id} className={styles.imageItem}>
                      <button
                        type="button"
                        className={styles.imageButton}
                        onClick={() => setLightbox({ images: comment.images, index })}
                        aria-label="Открыть изображение"
                      >
                        <img className={styles.imageThumb} src={image.url} alt="" />
                      </button>
                      <button
                        type="button"
                        className={styles.imageRemove}
                        aria-label="Удалить изображение"
                        onClick={() => void deleteCommentImage(product.id, comment.id, image.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <span className={styles.itemDate}>
                {new Date(comment.createdAt).toLocaleString('ru-RU')}
              </span>
            </li>
          ))}
        </ul>
      )}

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </section>
  );
}

