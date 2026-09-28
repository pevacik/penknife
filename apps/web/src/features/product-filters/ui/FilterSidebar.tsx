import { productionCountryOptions } from '@/entities/product';
import type { CountryFilter } from '@/entities/product';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { useFilterStore } from '../model/store';
import styles from './FilterSidebar.module.css';

export function FilterSidebar() {
  const country = useFilterStore((state) => state.country);
  const setCountry = useFilterStore((state) => state.setCountry);
  const circulation = useFilterStore((state) => state.circulation);
  const setCirculation = useFilterStore((state) => state.setCirculation);
  const maxBudget = useFilterStore((state) => state.maxBudget);
  const setMaxBudget = useFilterStore((state) => state.setMaxBudget);

  return (
    <aside className={styles.sidebar}>
      <h2 className={styles.heading}>Фильтры</h2>

      <label className={styles.field}>
        <span className={styles.label}>Сроки</span>
        <Select
          value={country}
          onChange={(event) => setCountry(event.target.value as CountryFilter)}
        >
          <option value="all">Оба</option>
          {productionCountryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Тираж</span>
        <Input
          inputMode="numeric"
          value={circulation}
          placeholder="Например: 1000"
          onChange={(event) => setCirculation(event.target.value.replace(/\D/g, ''))}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Бюджет, ₽</span>
        <Input
          inputMode="numeric"
          value={maxBudget}
          placeholder="Например: 5000"
          onChange={(event) => setMaxBudget(event.target.value.replace(/\D/g, ''))}
        />
      </label>
    </aside>
  );
}
