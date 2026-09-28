import { SearchBar } from '@/features/search-products';
import { AddProductButton } from '@/features/add-product';
import { CsvMenu } from '@/features/product-csv';
import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <span className={styles.logo}>Penknife</span>
        <div className={styles.search}>
          <SearchBar />
        </div>
        <AddProductButton />
        <CsvMenu />
      </div>
    </header>
  );
}

