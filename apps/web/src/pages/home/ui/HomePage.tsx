import { Header } from '@/widgets/header';
import { ProductList } from '@/widgets/product-list';
import { FilterSidebar } from '@/features/product-filters';
import styles from './HomePage.module.css';

export function HomePage() {
  return (
    <div className={styles.page}>
      <Header />
      <div className={styles.layout}>
        <FilterSidebar />
        <main className={styles.main}>
          <ProductList />
        </main>
      </div>
    </div>
  );
}

