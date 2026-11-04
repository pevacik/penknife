import { Link } from 'react-router-dom';
import { SearchBar } from '@/features/search-products';
import { AddProductButton } from '@/features/add-product';
import { CartButton } from '@/features/cart';
import { ChangePasswordButton } from '@/features/change-password';
import { CsvMenu } from '@/features/product-csv';
import { useAuthStore, useCan, ROLE_LABEL } from '@/entities/session';
import styles from './Header.module.css';

export function Header() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const canManageUsers = useCan('manageUsers');
  const roleLabel = user ? ROLE_LABEL[user.role] : null;

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <span className={styles.logo}>Penknife</span>
        <div className={styles.search}>
          <SearchBar />
        </div>
        <CartButton />
        <AddProductButton />
        <CsvMenu />
        {canManageUsers && (
          <Link to="/admin/users" className={styles.navLink}>
            Пользователи
          </Link>
        )}
        <div className={styles.account}>
          {user && <span className={styles.user}>{user.username}</span>}
          {roleLabel && <span className={styles.role}>{roleLabel}</span>}
          <ChangePasswordButton />
          <button type="button" className={styles.logout} onClick={() => void logout()}>
            Выйти
          </button>
        </div>
      </div>
    </header>
  );
}

