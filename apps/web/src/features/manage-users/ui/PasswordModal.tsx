import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import type { ManagedUser } from '../api';
import { useUsersStore } from '../model/store';
import styles from './ManageUsers.module.css';

interface PasswordModalProps {
  user: ManagedUser;
  onClose: () => void;
}

export function PasswordModal({ user, onClose }: PasswordModalProps) {
  const updateUser = useUsersStore((state) => state.update);
  const error = useUsersStore((state) => state.error);
  const clearError = useUsersStore((state) => state.clearError);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = password.length >= 12 && password === confirm && !submitting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    try {
      const saved = await updateUser(user.id, { password });
      if (saved) {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`Новый пароль: ${user.username}`}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" form="password-form" disabled={!canSubmit}>
            {submitting ? 'Сохранение…' : 'Сменить пароль'}
          </Button>
        </>
      }
    >
      <form id="password-form" className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span className={styles.label}>Новый пароль (минимум 12 символов)</span>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            autoFocus
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Повторите пароль</span>
          <Input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
          />
        </label>

        {mismatch && <p className={styles.error}>Пароли не совпадают</p>}
        {error && <p className={styles.error}>{error}</p>}

        <p className={styles.hint}>
          После смены пароля все сессии пользователя будут завершены — потребуется войти заново.
        </p>
      </form>
    </Modal>
  );
}
