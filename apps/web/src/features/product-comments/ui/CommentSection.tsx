import { useRef, useState } from 'react';
import type { ChangeEvent, ClipboardEvent, FormEvent } from 'react';
import { useProductStore } from '@/entities/product';
import type { Product, ProductImage } from '@/entities/product';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { ImageLightbox } from '@/shared/ui/ImageLightbox';
import { readImageFilesFromClipboard } from '@/shared/lib/clipboard';
import { getImageUrl } from '@/shared/lib/imageUrl';
import { uploadImage } from '@/shared/api/uploadImage';
import { useCan } from '@/entities/session';
import { showNoPermissionToast } from '@/shared/lib/toast';
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
  const updateComment = useProductStore((state) => state.updateComment);
  const deleteComment = useProductStore((state) => state.deleteComment);
  const deleteCommentImage = useProductStore((state) => state.deleteCommentImage);
  const canManage = useCan('manageComments');
  const canDeleteComments = useCan('deleteComments');
  const canDeleteImages = useCan('deleteImages');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const startEdit = (comment: Product['comments'][number]) => {
    if (!canManage) {
      showNoPermissionToast();
      return;
    }
    setEditingId(comment.id);
    setEditTitle(comment.title);
    setEditText(comment.text);
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!canManage) {
      showNoPermissionToast();
      return;
    }
    if (!editTitle.trim() || savingEdit) {
      return;
    }

    setSavingEdit(true);
    setEditError(null);
    try {
      await updateComment(product.id, commentId, {
        title: editTitle.trim(),
        text: editText.trim(),
      });
      setEditingId(null);
    } catch (err) {
      setEditError(
        err instanceof Error && err.message ? err.message : 'Не удалось сохранить комментарий',
      );
    } finally {
      setSavingEdit(false);
    }
  };

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
      const urls: string[] = [];
      for (const file of files) {
        const { url } = await uploadImage(file);
        urls.push(url);
      }
      setImages((prev) => [...prev, ...urls]);
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
    if (!canManage) {
      showNoPermissionToast();
      return;
    }
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
          disabled={!canManage}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Textarea
          value={text}
          placeholder="Комментарий"
          disabled={!canManage}
          onChange={(event) => setText(event.target.value)}
        />

        {images.length > 0 && (
          <div className={styles.previewList}>
            {images.map((url, index) => (
              <div key={`${url}-${index}`} className={styles.previewItem}>
                <img
                  className={styles.previewImage}
                  src={getImageUrl(url, 'thumb')}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
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
          <Button
            type="submit"
            inactive={!canManage}
            disabled={saving || (canManage && !title.trim())}
          >
            {saving ? 'Сохранение…' : 'Сохранить комментарий'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            inactive={!canManage}
            onClick={() => {
              if (!canManage) {
                showNoPermissionToast();
                return;
              }
              fileInputRef.current?.click();
            }}
            disabled={uploading}
          >
            {uploading ? 'Загрузка…' : 'Прикрепить изображение'}
          </Button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <p className={styles.hint}>
          {canManage
            ? 'Комментарий будет подписан вашим именем. Можно вставить изображение из буфера обмена (Ctrl+V)'
            : 'Только просмотр: добавлять и редактировать комментарии могут администратор и пользователи.'}
        </p>

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
          {product.comments.map((comment) => {
            const isEditing = editingId === comment.id;

            return (
              <li key={comment.id} className={styles.item}>
                {isEditing ? (
                  <div className={styles.editForm}>
                    <Input
                      value={editTitle}
                      placeholder="Заголовок"
                      onChange={(event) => setEditTitle(event.target.value)}
                    />
                    <Textarea
                      value={editText}
                      placeholder="Комментарий"
                      onChange={(event) => setEditText(event.target.value)}
                    />
                    {editError && <p className={styles.error}>{editError}</p>}
                    <div className={styles.editActions}>
                      <Button
                        type="button"
                        onClick={() => void handleSaveEdit(comment.id)}
                        disabled={savingEdit || !editTitle.trim()}
                      >
                        {savingEdit ? 'Сохранение…' : 'Сохранить'}
                      </Button>
                      <Button type="button" variant="ghost" onClick={cancelEdit} disabled={savingEdit}>
                        Отмена
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.itemHeader}>
                      <h3 className={styles.itemTitle}>{comment.title}</h3>
                      <div className={styles.commentActions}>
                        <button
                          type="button"
                          className={`${styles.edit} ${canManage ? '' : styles.actionInactive}`}
                          aria-disabled={!canManage || undefined}
                          onClick={() => startEdit(comment)}
                        >
                          Редактировать
                        </button>
                        <button
                          type="button"
                          className={`${styles.delete} ${canDeleteComments ? '' : styles.actionInactive}`}
                          aria-disabled={!canDeleteComments || undefined}
                          onClick={() => {
                            if (!canDeleteComments) {
                              showNoPermissionToast();
                              return;
                            }
                            void deleteComment(product.id, comment.id);
                          }}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                    {comment.text && <p className={styles.itemText}>{comment.text}</p>}
                  </>
                )}

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
                          <img
                            className={styles.imageThumb}
                            src={getImageUrl(image.url, 'thumb')}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        </button>
                        <button
                          type="button"
                          className={`${styles.imageRemove} ${canDeleteImages ? '' : styles.actionInactive}`}
                          aria-label="Удалить изображение"
                          aria-disabled={!canDeleteImages || undefined}
                          onClick={() => {
                            if (!canDeleteImages) {
                              showNoPermissionToast();
                              return;
                            }
                            void deleteCommentImage(product.id, comment.id, image.id);
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <span className={styles.itemDate}>
                  {comment.authorName || 'Автор не указан'} ·{' '}
                  {new Date(comment.createdAt).toLocaleString('ru-RU')}
                  {comment.updatedAt && (
                    <>
                      {' '}· изменён {comment.updatedByName || 'неизвестно'}{' '}
                      {new Date(comment.updatedAt).toLocaleString('ru-RU')}
                    </>
                  )}
                </span>
              </li>
            );
          })}
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

