import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore, useCan, ROLE_LABEL } from '@/entities/session';
import { ChangePasswordModal } from '@/features/change-password';
import styles from './AccountMenu.module.css';

export function AccountMenu() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const canManageUsers = useCan('manageUsers');
  const canViewAudit = useCan('viewAudit');
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!user) {
    return null;
  }

  const roleLabel = ROLE_LABEL[user.role];

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Меню и настройки"
      >
        <span className={styles.menuIcon} aria-hidden="true">
          ☰
        </span>
        <span className={styles.triggerLabel}>Меню</span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className={styles.dropdown} role="menu" aria-label="Меню и настройки">
          <div className={styles.account}>
            <span className={styles.username}>{user.username}</span>
            <span className={styles.role}>{roleLabel}</span>
          </div>

          <div className={styles.section} role="group" aria-label="Настройки">
            <span className={styles.sectionLabel}>Настройки</span>
            <button
              type="button"
              className={styles.item}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setPasswordOpen(true);
              }}
            >
              Сменить пароль
            </button>
            {/* Будущие настройки, не относящиеся к работе с карточками, добавляются сюда. */}
          </div>

          {(canManageUsers || canViewAudit) && (
            <div className={styles.section} role="group" aria-label="Администрирование">
              <span className={styles.sectionLabel}>Администрирование</span>
              {canManageUsers && (
                <Link
                  to="/admin/users"
                  className={styles.item}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  Пользователи
                </Link>
              )}
              {canViewAudit && (
                <Link
                  to="/admin/audit"
                  className={styles.item}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  Журнал действий
                </Link>
              )}
            </div>
          )}

          <div className={styles.section} role="group" aria-label="Сессия">
            <button
              type="button"
              className={`${styles.item} ${styles.logout}`}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void logout();
              }}
            >
              Выйти
            </button>
          </div>
        </div>
      )}

      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
}
