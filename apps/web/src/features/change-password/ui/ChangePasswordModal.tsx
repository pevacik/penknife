import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { authApi } from '@/entities/session';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import styles from './ChangePasswordModal.module.css';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setNewPassword('');
    setConfirm('');
    setError(null);
    setDone(false);
  }, [open]);

  const mismatch = confirm.length > 0 && newPassword !== confirm;
  const canSubmit = newPassword.length >= 12 && newPassword === confirm && !saving;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await authApi.changePassword(newPassword);
      setNewPassword('');
      setConfirm('');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Не удалось изменить пароль');
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <Modal
      title="Сменить пароль"
      onClose={onClose}
      actions={
        done ? (
          <Button onClick={onClose}>Закрыть</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" form="change-password-form" disabled={!canSubmit}>
              {saving ? 'Сохранение…' : 'Сменить пароль'}
            </Button>
          </>
        )
      }
    >
      {done ? (
        <p className={styles.done}>
          Пароль изменён. Остальные сессии завершены — на других устройствах потребуется войти заново.
        </p>
      ) : (
        <form id="change-password-form" className={styles.form} onSubmit={handleSubmit}>
          <p className={styles.hint}>
            Старый пароль не требуется. После смены остальные сессии будут завершены.
          </p>

          <label className={styles.field}>
            <span className={styles.label}>Новый пароль (минимум 12 символов)</span>
            <Input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              autoFocus
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Повторите новый пароль</span>
            <Input
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="new-password"
            />
          </label>

          {mismatch && <p className={styles.error}>Пароли не совпадают</p>}
          {error && <p className={styles.error}>{error}</p>}
        </form>
      )}
    </Modal>
  );
}
