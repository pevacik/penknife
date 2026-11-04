import { createHash, randomBytes } from 'node:crypto';
import { SESSION_TOUCH_INTERVAL_MS, SESSION_TTL_MS } from '../config';
import { prisma } from '../db';
import { getEffectivePermissions } from './permissions';
import type { Permission } from './permissions';
import { isRole } from './roles';
import type { Role } from './roles';

export interface AuthUser {
  id: string;
  username: string;
  role: Role;
  permissions: Permission[];
}

export interface AuthUserRow {
  id: string;
  username: string;
  role: string;
  grantedPermissions: string[];
  revokedPermissions: string[];
}

/** Приводит запись пользователя к безопасной форме с эффективными правами. */
export function toAuthUser(user: AuthUserRow): AuthUser {
  // Неизвестное значение в БД не должно давать прав: трактуем как viewer.
  const role: Role = isRole(user.role) ? user.role : 'viewer';

  return {
    id: user.id,
    username: user.username,
    role,
    permissions: getEffectivePermissions(role, user.grantedPermissions, user.revokedPermissions),
  };
}

export interface CreatedSession {
  token: string;
  expiresAt: Date;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string): Promise<CreatedSession> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });

  return { token, expiresAt };
}

export async function findSessionUser(token: string): Promise<AuthUser | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  const now = Date.now();
  if (session.expiresAt.getTime() <= now) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  if (now - session.lastUsedAt.getTime() > SESSION_TOUCH_INTERVAL_MS) {
    await prisma.session
      .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
  }

  return toAuthUser(session.user);
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export async function deleteUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

/** Завершает все сессии пользователя, кроме текущей (например, после смены пароля). */
export async function deleteOtherSessions(userId: string, keepToken: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId, tokenHash: { not: hashToken(keepToken) } },
  });
}

export async function cleanupExpiredSessions(): Promise<void> {
  await prisma.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
}
