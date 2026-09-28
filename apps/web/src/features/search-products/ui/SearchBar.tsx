import { Input } from '@/shared/ui/Input';
import { useSearchStore } from '../model/store';
import styles from './SearchBar.module.css';

export function SearchBar() {
  const query = useSearchStore((state) => state.query);
  const setQuery = useSearchStore((state) => state.setQuery);

  return (
    <Input
      type="search"
      placeholder="Поиск по карточкам…"
      value={query}
      onChange={(event) => setQuery(event.target.value)}
      className={styles.input}
    />
  );
}
