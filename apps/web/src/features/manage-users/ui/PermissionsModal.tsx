import { useEffect, useState } from 'react';
import {
  OVERRIDABLE_PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_LABEL,
  ROLE_LABEL,
  ROLE_PERMISSIONS,
} from '@/entities/session';
import type { AuthRole, Permission } from '@/entities/session';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { Select } from '@/shared/ui/Select';
import type { ManagedUser } from '../api';
import { useUsersStore } from '../model/store';
import styles from './ManageUsers.module.css';

interface PermissionsModalProps {
  user: ManagedUser;
  onClose: () => void;
}

const ROLE_OPTIONS = Object.entries(ROLE_LABEL) as Array<[AuthRole, string]>;

export function PermissionsModal({ user, onClose }: PermissionsModalProps) {
  const updateUser = useUsersStore((state) => state.update);
  const error = useUsersStore((state) => state.error);
  const clearError = useUsersStore((state) => state.clearError);

  const [role, setRole] = useState<AuthRole>(user.role);
  const [selected, setSelected] = useState<Set<Permission>>(new Set(user.permissions));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const base = new Set(ROLE_PERMISSIONS[role]);

  const handleRoleChange = (nextRole: AuthRole) => {
    setRole(nextRole);
    // Новая роль — новые базовые права; оверрайды прежней роли сбрасываем.
    setSelected(new Set(ROLE_PERMISSIONS[nextRole]));
  };

  const toggle = (permission: Permission) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(permission)) {
        next.delete(permission);
      } else {
        next.add(permission);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const granted = OVERRIDABLE_PERMISSIONS.filter(
        (permission) => selected.has(permission) && !base.has(permission),
      );
      const revoked = OVERRIDABLE_PERMISSIONS.filter(
        (permission) => !selected.has(permission) && base.has(permission),
      );

      const saved = await updateUser(user.id, {
        role,
        grantedPermissions: granted,
        revokedPermissions: revoked,
      });

      if (saved) {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`Права: ${user.username}`}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? 'Сохранение…' : 'Сохранить'}
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <label className={styles.field}>
          <span className={styles.label}>Роль</span>
          <Select value={role} onChange={(event) => handleRoleChange(event.target.value as AuthRole)}>
            {ROLE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </label>

        <p className={styles.hint}>
          Галочки показывают эффективные права. Сверх роли можно выдать дополнительные, а базовые —
          отозвать. Смена роли разлогинивает пользователя.
        </p>

        {PERMISSION_GROUPS.map((group) => (
          <fieldset key={group.title} className={styles.group}>
            <legend className={styles.groupTitle}>{group.title}</legend>
            {group.permissions.map((permission) => (
              <label key={permission} className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={selected.has(permission)}
                  onChange={() => toggle(permission)}
                />
                <span>{PERMISSION_LABEL[permission]}</span>
              </label>
            ))}
          </fieldset>
        ))}

        <div className={styles.structural}>
          <label className={styles.checkboxRow}>
            <input type="checkbox" checked readOnly disabled />
            <span>{PERMISSION_LABEL.viewProducts} — доступно всем вошедшим</span>
          </label>
          {(['deleteProduct', 'deleteImages', 'deleteComments', 'csv', 'manageUsers', 'viewAudit'] as Permission[]).map(
            (permission) => (
              <label key={permission} className={styles.checkboxRow}>
                <input type="checkbox" checked={role === 'admin'} readOnly disabled />
                <span>{PERMISSION_LABEL[permission]} — только роль «Администратор»</span>
              </label>
            ),
          )}
        </div>

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </Modal>
  );
}
