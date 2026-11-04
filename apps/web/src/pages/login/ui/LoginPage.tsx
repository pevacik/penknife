import { LoginForm } from '@/features/auth';
import styles from './LoginPage.module.css';

export function LoginPage() {
  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <h1 className={styles.logo}>Penknife</h1>
        <p className={styles.subtitle}>Вход для менеджера</p>
        <LoginForm />
      </main>
    </div>
  );
}
