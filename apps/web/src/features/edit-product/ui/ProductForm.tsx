import { useState } from 'react';
import type { FormEvent } from 'react';
import { productionCountryOptions, useProductStore } from '@/entities/product';
import type { Product, ProductionCountry } from '@/entities/product';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import styles from './ProductForm.module.css';

interface FormValues {
  title: string;
  price: number;
  circulation: string;
  make50: boolean;
  productionCountry: ProductionCountry;
  tags: string;
}

interface ProductFormProps {
  product: Product;
}

export function ProductForm({ product }: ProductFormProps) {
  const updateProduct = useProductStore((state) => state.updateProduct);

  const [values, setValues] = useState<FormValues>({
    title: product.title,
    price: product.price,
    circulation: product.circulation,
    make50: product.make50,
    productionCountry: product.productionCountry,
    tags: product.tags.join(', '),
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }) as FormValues);
    setSaved(false);
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProduct(product.id, {
        title: values.title,
        price: values.price,
        circulation: values.circulation,
        make50: values.make50,
        productionCountry: values.productionCountry,
        tags: values.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      setSaved(true);
    } catch {
      // keep the form open so the user can retry
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span className={styles.label}>Название изделия</span>
        <Input
          value={values.title}
          placeholder="Например: Складной нож"
          onChange={(event) => setField('title', event.target.value)}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Цена, ₽</span>
        <Input
          value={values.price === 0 ? '' : String(values.price)}
          placeholder="Например: 1500"
          inputMode="numeric"
          onChange={(event) =>
            setField('price', Number(event.target.value.replace(/\D/g, '')) || 0)
          }
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Тираж</span>
        <Input
          value={values.circulation}
          placeholder="Любое количество"
          inputMode="numeric"
          onChange={(event) => setField('circulation', event.target.value.replace(/\D/g, ''))}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Сделать 50</span>
        <Select
          value={values.make50 ? 'yes' : 'no'}
          onChange={(event) => setField('make50', event.target.value === 'yes')}
        >
          <option value="no">Нет</option>
          <option value="yes">Да</option>
        </Select>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Срок производства</span>
        <Select
          value={values.productionCountry}
          onChange={(event) =>
            setField('productionCountry', event.target.value as ProductionCountry)
          }
        >
          {productionCountryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Теги</span>
        <Input
          value={values.tags}
          placeholder="Слова через запятую, например: нож, сталь, подарок"
          onChange={(event) => setField('tags', event.target.value)}
        />
      </label>

      <div className={styles.actions}>
        <Button type="submit" disabled={saving}>
          {saving ? 'Сохранение…' : 'Сохранить'}
        </Button>
        {saved && <span className={styles.saved}>Сохранено</span>}
      </div>
    </form>
  );
}


