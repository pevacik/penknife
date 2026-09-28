import { useState } from 'react';
import type { FormEvent } from 'react';
import { useProductStore } from '@/entities/product';
import type { Product } from '@/entities/product';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import styles from './CommentSection.module.css';

interface CommentSectionProps {
  product: Product;
}

export function CommentSection({ product }: CommentSectionProps) {
  const addComment = useProductStore((state) => state.addComment);
  const deleteComment = useProductStore((state) => state.deleteComment);

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }

    setSaving(true);
    try {
      await addComment(product.id, { title: title.trim(), text: text.trim() });
      setTitle('');
      setText('');
    } catch {
      // keep the form so the user can retry
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Комментарии</h2>

      <form className={styles.form} onSubmit={handleSubmit}>
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
        <div className={styles.formActions}>
          <Button type="submit" disabled={saving || !title.trim()}>
            {saving ? 'Сохранение…' : 'Сохранить комментарий'}
          </Button>
        </div>
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
              <span className={styles.itemDate}>
                {new Date(comment.createdAt).toLocaleString('ru-RU')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
