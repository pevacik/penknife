import { useEffect, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { showToast } from '@/shared/lib/toast';
import type { ManagedUser } from '../api';
import { usersApi } from '../api';
import styles from './ManageUsers.module.css';

interface PasswordRevealModalProps {
  user: ManagedUser;
  onClose: () => void;
}

interface PasswordState {
  password: string | null;
  message?: string;
}

export function PasswordRevealModal({ user, onClose }: PasswordRevealModalProps) {
  const [state, setState] = useState<PasswordState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setState(null);
    setError(null);

    void usersApi
      .getPassword(user.id)
      .then((result) => {
        if (active) {
          setState(result);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error && err.message ? err.message : 'Не удалось получить пароль');
        }
      });

    return () => {
      active = false;
    };
  }, [user.id]);

  const copyPassword = async () => {
    if (!state?.password) {
      return;
    }

    try {
      await navigator.clipboard.writeText(state.password);
      showToast('Пароль скопирован');
    } catch {
      showToast('Не удалось скопировать пароль');
    }
  };

  return (
    <Modal
      title={`Пароль: ${user.username}`}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={() => void copyPassword()} disabled={!state?.password}>
            Скопировать
          </Button>
          <Button onClick={onClose}>Закрыть</Button>
        </>
      }
    >
      {error ? (
        <p className={styles.error}>{error}</p>
      ) : state === null ? (
        <p className={styles.hint}>Загрузка…</p>
      ) : state.password ? (
        <>
          <p className={styles.hint}>
            Пароль хранится в зашифрованном виде и показывается только администратору.
          </p>
          <div className={styles.passwordValue}>{state.password}</div>
        </>
      ) : (
        <p className={styles.hint}>{state.message ?? 'Пароль недоступен'}</p>
      )}
    </Modal>
  );
}
