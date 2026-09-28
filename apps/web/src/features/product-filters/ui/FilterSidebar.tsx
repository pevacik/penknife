import { productionCountryOptions } from "@/entities/product";
import type { CountryFilter, Make50Filter } from "@/entities/product";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { DownloadListButton } from "@/features/product-selection";
import { useFilterStore } from "../model/store";
import styles from "./FilterSidebar.module.css";

export function FilterSidebar() {
  const country = useFilterStore((state) => state.country);
  const setCountry = useFilterStore((state) => state.setCountry);
  const make50 = useFilterStore((state) => state.make50);
  const setMake50 = useFilterStore((state) => state.setMake50);
  const circulation = useFilterStore((state) => state.circulation);
  const setCirculation = useFilterStore((state) => state.setCirculation);
  const maxBudget = useFilterStore((state) => state.maxBudget);
  const setMaxBudget = useFilterStore((state) => state.setMaxBudget);

  return (
    <aside className={styles.sidebar}>
      <h2 className={styles.heading}>Фильтры</h2>

      <label className={styles.field}>
        <span className={styles.label}>Тираж</span>
        <Input
          inputMode="numeric"
          value={circulation}
          placeholder="Например: 1000"
          onChange={(event) =>
            setCirculation(event.target.value.replace(/\D/g, ""))
          }
        />
      </label>

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
        <span className={styles.label}>Бюджет, ₽</span>
        <Input
          inputMode="numeric"
          value={maxBudget}
          placeholder="Например: 5000"
          onChange={(event) =>
            setMaxBudget(event.target.value.replace(/\D/g, ""))
          }
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Сделать 50</span>
        <Select
          value={make50}
          onChange={(event) => setMake50(event.target.value as Make50Filter)}
        >
          <option value="all">Пусто</option>
          <option value="yes">Да</option>
        </Select>
      </label>

      <div className={styles.download}>
        <DownloadListButton />
      </div>
    </aside>
  );
}
