import { useState } from 'react';
import type { FormEvent } from 'react';
import { productFields, useProductStore } from '@/entities/product';
import type { Product, ProductFieldKey } from '@/entities/product';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import styles from './ProductForm.module.css';

type FormValues = Record<ProductFieldKey, string>;

interface ProductFormProps {
  product: Product;
}

export function ProductForm({ product }: ProductFormProps) {
  const updateProduct = useProductStore((state) => state.updateProduct);

  const [values, setValues] = useState<FormValues>({
    title: product.title,
    minOrder: product.minOrder,
    productionTime: product.productionTime,
    description: product.description,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (key: ProductFieldKey, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }) as FormValues);
    setSaved(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProduct(product.id, values);
      setSaved(true);
    } catch {
      // keep the form open so the user can retry
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {productFields.map((field) => (
        <label key={field.key} className={styles.field}>
          <span className={styles.label}>{field.label}</span>
          {field.multiline ? (
            <Textarea
              value={values[field.key]}
              placeholder={field.placeholder}
              onChange={(event) => handleChange(field.key, event.target.value)}
            />
          ) : (
            <Input
              value={values[field.key]}
              placeholder={field.placeholder}
              onChange={(event) => handleChange(field.key, event.target.value)}
            />
          )}
        </label>
      ))}

      <div className={styles.actions}>
        <Button type="submit" disabled={saving}>
          {saving ? 'Сохранение…' : 'Сохранить'}
        </Button>
        {saved && <span className={styles.saved}>Сохранено</span>}
      </div>
    </form>
  );
}
