import { useState } from 'react';
import { ChangePasswordModal } from './ChangePasswordModal';
import styles from './ChangePasswordButton.module.css';

export function ChangePasswordButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
        Пароль
      </button>
      <ChangePasswordModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
