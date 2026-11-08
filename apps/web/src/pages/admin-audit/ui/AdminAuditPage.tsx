import { Link, Navigate } from 'react-router-dom';
import { useCan } from '@/entities/session';
import { AuditPanel } from '@/features/audit-log';
import { Header } from '@/widgets/header';
import styles from './AdminAuditPage.module.css';

export function AdminAuditPage() {
  const canViewAudit = useCan('viewAudit');

  if (!canViewAudit) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <Link to="/" className={styles.back}>
          ← К карточкам
        </Link>
        <AuditPanel />
      </main>
    </div>
  );
}
