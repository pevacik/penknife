import { Link } from 'react-router-dom';
import { SearchBar } from '@/features/search-products';
import { AddProductButton } from '@/features/add-product';
import { CartButton } from '@/features/cart';
import { CsvMenu } from '@/features/product-csv';
import { clearHomeScroll } from '@/shared/lib/scroll';
import { AccountMenu } from './AccountMenu';
import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo} onClick={clearHomeScroll}>
          Penknife
        </Link>
        <div className={styles.search}>
          <SearchBar />
        </div>
        <CartButton />
        <AddProductButton />
        <CsvMenu />
        <AccountMenu />
      </div>
    </header>
  );
}

