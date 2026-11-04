import type { RequestHandler } from 'express';
import type { Permission } from '../auth/permissions';

/**
 * Проверяет конкретное право (с учётом персональных надстроек пользователя).
 * Ставится после `requireAuth`.
 */
export function requirePermission(permission: Permission): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ message: 'Требуется вход' });
      return;
    }

    if (!req.user.permissions.includes(permission)) {
      res.status(403).json({ message: 'Недостаточно прав' });
      return;
    }

    next();
  };
}
