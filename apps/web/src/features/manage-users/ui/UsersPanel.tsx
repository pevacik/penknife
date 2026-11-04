import { useEffect, useState } from 'react';
import { PERMISSION_LABEL, ROLE_LABEL, useAuthStore } from '@/entities/session';
import { Button } from '@/shared/ui/Button';
import type { ManagedUser } from '../api';
import { useUsersStore } from '../model/store';
import { PasswordModal } from './PasswordModal';
import { PermissionsModal } from './PermissionsModal';
import { UserFormModal } from './UserFormModal';
import styles from './ManageUsers.module.css';

export function UsersPanel() {
  const users = useUsersStore((state) => state.users);
  const loading = useUsersStore((state) => state.loading);
  const error = useUsersStore((state) => state.error);
  const load = useUsersStore((state) => state.load);
  const removeUser = useUsersStore((state) => state.remove);
  const logoutSessions = useUsersStore((state) => state.logoutSessions);
  const currentUserId = useAuthStore((state) => state.user?.id);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [passwordFor, setPasswordFor] = useState<ManagedUser | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  const adminCount = users.filter((user) => user.role === 'admin').length;

  const handleDelete = async (user: ManagedUser) => {
    if (!window.confirm(`Удалить пользователя «${user.username}»?`)) {
      return;
    }

    await removeUser(user.id);
  };

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h1 className={styles.heading}>Пользователи</h1>
          <p className={styles.subtitle}>Всего: {users.length}</p>
        </div>
        <Button onClick={() => setCreating(true)}>Добавить пользователя</Button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {loading && users.length === 0 ? (
        <p className={styles.state}>Загрузка…</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Логин</th>
                <th>Роль</th>
                <th>Доп. права</th>
                <th>Пароль обновлён</th>
                <th>Сессии</th>
                <th>Создан</th>
                <th aria-label="Действия" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === currentUserId;
                const isLastAdmin = user.role === 'admin' && adminCount <= 1;

                return (
                  <tr key={user.id}>
                    <td>
                      <span className={styles.username}>{user.username}</span>
                      {isSelf && <span className={styles.self}>это вы</span>}
                    </td>
                    <td>{ROLE_LABEL[user.role]}</td>
                    <td>
                      <Extras user={user} />
                    </td>
                    <td>
                      <span className={styles.passwordInfo}>{formatPasswordChange(user)}</span>
                    </td>
                    <td>{user.sessions}</td>
                    <td>{new Date(user.createdAt).toLocaleString('ru-RU')}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.action}
                          disabled={isSelf}
                          onClick={() => setEditing(user)}
                        >
                          Права
                        </button>
                        <button
                          type="button"
                          className={styles.action}
                          disabled={isSelf}
                          onClick={() => setPasswordFor(user)}
                        >
                          Пароль
                        </button>
                        <button
                          type="button"
                          className={styles.action}
                          disabled={isSelf || user.sessions === 0}
                          onClick={() => void logoutSessions(user.id)}
                        >
                          Разлогинить
                        </button>
                        <button
                          type="button"
                          className={`${styles.action} ${styles.danger}`}
                          disabled={isSelf || isLastAdmin}
                          onClick={() => void handleDelete(user)}
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {creating && <UserFormModal onClose={() => setCreating(false)} />}
      {editing && <PermissionsModal user={editing} onClose={() => setEditing(null)} />}
      {passwordFor && <PasswordModal user={passwordFor} onClose={() => setPasswordFor(null)} />}
    </section>
  );
}

function formatPasswordChange(user: ManagedUser): string {
  if (!user.passwordChangedAt || !user.passwordChangedBy) {
    return '—';
  }

  const date = new Date(user.passwordChangedAt).toLocaleString('ru-RU');

  if (user.passwordChangedBy === 'self') {
    return `сам · ${date}`;
  }
  if (user.passwordChangedBy === 'cli') {
    return `CLI · ${date}`;
  }

  return `${user.passwordChangedByName ?? 'админ'} · ${date}`;
}

function Extras({ user }: { user: ManagedUser }) {
  if (user.grantedPermissions.length === 0 && user.revokedPermissions.length === 0) {
    return <span className={styles.muted}>—</span>;
  }

  return (
    <div className={styles.extras}>
      {user.grantedPermissions.map((permission) => (
        <span key={`granted-${permission}`} className={styles.granted}>
          + {PERMISSION_LABEL[permission]}
        </span>
      ))}
      {user.revokedPermissions.map((permission) => (
        <span key={`revoked-${permission}`} className={styles.revoked}>
          − {PERMISSION_LABEL[permission]}
        </span>
      ))}
    </div>
  );
}
