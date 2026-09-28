import { Header } from '@/widgets/header';
import { ProductList } from '@/widgets/product-list';
import styles from './HomePage.module.css';

export function HomePage() {
  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <ProductList />
      </main>
    </div>
  );
}
