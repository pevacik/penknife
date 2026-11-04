import { Link, Navigate } from 'react-router-dom';
import { useCan } from '@/entities/session';
import { UsersPanel } from '@/features/manage-users';
import { Header } from '@/widgets/header';
import styles from './AdminUsersPage.module.css';

export function AdminUsersPage() {
  const canManageUsers = useCan('manageUsers');

  if (!canManageUsers) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <Link to="/" className={styles.back}>
          ← К карточкам
        </Link>
        <UsersPanel />
      </main>
    </div>
  );
}
