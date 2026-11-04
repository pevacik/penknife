import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuthStore } from '@/entities/session';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import styles from './LoginForm.module.css';

export function LoginForm() {
  const login = useAuthStore((state) => state.login);
  const error = useAuthStore((state) => state.error);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setSubmitting(true);
    try {
      await login(username, password);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span className={styles.label}>Логин</span>
        <Input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          autoFocus
          required
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Пароль</span>
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </label>

      {error && <p className={styles.error}>{error}</p>}

      <Button
        type="submit"
        className={styles.submit}
        disabled={submitting || !username.trim() || !password}
      >
        {submitting ? 'Вход…' : 'Войти'}
      </Button>
    </form>
  );
}
