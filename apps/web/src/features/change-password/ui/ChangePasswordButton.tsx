import { useState } from 'react';
import type { FormEvent } from 'react';
import { authApi } from '@/entities/session';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import styles from './ChangePasswordButton.module.css';

export function ChangePasswordButton() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const openModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirm('');
    setError(null);
    setDone(false);
    setOpen(true);
  };

  const mismatch = confirm.length > 0 && newPassword !== confirm;
  const sameAsCurrent = newPassword.length > 0 && newPassword === currentPassword;
  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= 12 &&
    newPassword === confirm &&
    !sameAsCurrent &&
    !saving;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Не удалось изменить пароль');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button type="button" className={styles.trigger} onClick={openModal}>
        Пароль
      </button>

      {open && (
        <Modal
          title="Сменить пароль"
          onClose={() => setOpen(false)}
          actions={
            done ? (
              <Button onClick={() => setOpen(false)}>Закрыть</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setOpen(false)}>
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
              Пароль изменён. Остальные сессии завершены — на других устройствах потребуется войти
              заново.
            </p>
          ) : (
            <form id="change-password-form" className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.field}>
                <span className={styles.label}>Текущий пароль</span>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                  autoFocus
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Новый пароль (минимум 12 символов)</span>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
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
              {sameAsCurrent && (
                <p className={styles.error}>Новый пароль должен отличаться от текущего</p>
              )}
              {error && <p className={styles.error}>{error}</p>}
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
