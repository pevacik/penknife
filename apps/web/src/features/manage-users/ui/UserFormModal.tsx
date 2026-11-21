import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ROLE_LABEL } from '@/entities/session';
import type { AuthRole } from '@/entities/session';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { Select } from '@/shared/ui/Select';
import { useUsersStore } from '../model/store';
import styles from './ManageUsers.module.css';

interface UserFormModalProps {
  onClose: () => void;
}

const ROLE_OPTIONS = Object.entries(ROLE_LABEL) as Array<[AuthRole, string]>;

export function UserFormModal({ onClose }: UserFormModalProps) {
  const createUser = useUsersStore((state) => state.create);
  const error = useUsersStore((state) => state.error);
  const clearError = useUsersStore((state) => state.clearError);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AuthRole>('user');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const canSubmit = username.trim().length >= 3 && password.length >= 12 && !submitting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    try {
      const created = await createUser({ username: username.trim(), password, role });
      if (created) {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Новый пользователь"
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" form="create-user-form" disabled={!canSubmit}>
            {submitting ? 'Создание…' : 'Создать'}
          </Button>
        </>
      }
    >
      <form id="create-user-form" className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span className={styles.label}>Логин</span>
          <Input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="off"
            autoFocus
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Пароль (минимум 12 символов)</span>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Роль</span>
          <Select value={role} onChange={(event) => setRole(event.target.value as AuthRole)}>
            {ROLE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </label>

        {error && <p className={styles.error}>{error}</p>}

        <p className={styles.hint}>
          Дополнительные права можно выдать после создания — в разделе «Права».
        </p>
      </form>
    </Modal>
  );
}
