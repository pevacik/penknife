import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { hashPassword } from '../auth/password';
import { isOverridablePermission, isPermission } from '../auth/permissions';
import { ROLES, isRole } from '../auth/roles';
import type { Role } from '../auth/roles';
import { deleteUserSessions, toAuthUser } from '../auth/session';
import { prisma } from '../db';
import { httpError } from '../httpError';
import { requirePermission } from '../middleware/requirePermission';

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 200;

interface UserRow {
  id: string;
  username: string;
  role: string;
  grantedPermissions: string[];
  revokedPermissions: string[];
  passwordChangedAt: Date | null;
  passwordChangedById: string | null;
  passwordChangedByName: string | null;
  createdAt: Date;
}

export const usersRouter = Router();

// Управление пользователями — только у роли admin (структурное право).
usersRouter.use(requirePermission('manageUsers'));

function serializeUser(user: UserRow, sessions = 0) {
  const authUser = toAuthUser(user);

  const passwordChangedBy =
    user.passwordChangedAt === null
      ? null
      : user.passwordChangedById === null
        ? 'cli'
        : user.passwordChangedById === user.id
          ? 'self'
          : 'admin';

  return {
    id: user.id,
    username: user.username,
    role: authUser.role,
    permissions: authUser.permissions,
    grantedPermissions: user.grantedPermissions,
    revokedPermissions: user.revokedPermissions,
    passwordChangedAt: user.passwordChangedAt ? user.passwordChangedAt.toISOString() : null,
    passwordChangedBy,
    passwordChangedByName: user.passwordChangedByName,
    createdAt: user.createdAt.toISOString(),
    sessions,
  };
}

function readString(body: Record<string, unknown>, field: string): string | undefined {
  const value = body[field];

  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw httpError(`Поле ${field} должно быть строкой`);
  }

  return value;
}

function readUsername(body: Record<string, unknown>): string {
  const username = readString(body, 'username')?.trim();

  if (!username) {
    throw httpError('Укажите логин');
  }
  if (!USERNAME_PATTERN.test(username)) {
    throw httpError('Логин: 3–32 символа, только латиница, цифры, точка, дефис и подчёркивание');
  }

  return username;
}

function readPassword(body: Record<string, unknown>): string {
  const password = readString(body, 'password');

  if (!password) {
    throw httpError('Укажите пароль');
  }
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw httpError(`Пароль должен быть от ${MIN_PASSWORD_LENGTH} до ${MAX_PASSWORD_LENGTH} символов`);
  }

  return password;
}

function readRole(body: Record<string, unknown>, fallback?: Role): Role | undefined {
  const value = body.role;

  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== 'string' || !isRole(value)) {
    throw httpError(`Роль должна быть одной из: ${ROLES.join(', ')}`);
  }

  return value;
}

function readPermissionList(body: Record<string, unknown>, field: string): string[] | undefined {
  const value = body[field];

  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw httpError(`Поле ${field} должно быть массивом строк`);
  }

  for (const permission of value) {
    if (!isPermission(permission)) {
      throw httpError(`Неизвестное право: ${permission}`);
    }
    if (!isOverridablePermission(permission)) {
      throw httpError(`Право ${permission} нельзя переопределять`);
    }
  }

  return [...new Set(value)];
}

function countAdmins(): Promise<number> {
  return prisma.user.count({ where: { role: 'admin' } });
}

usersRouter.get('/', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        username: true,
        role: true,
        grantedPermissions: true,
        revokedPermissions: true,
        passwordChangedAt: true,
        passwordChangedById: true,
        passwordChangedByName: true,
        createdAt: true,
        _count: { select: { sessions: true } },
      },
    });

    res.json({ users: users.map((user) => serializeUser(user, user._count.sessions)) });
  } catch (error) {
    next(error);
  }
});

usersRouter.post('/', async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const username = readUsername(body);
    const password = readPassword(body);
    const role = readRole(body) ?? 'user';
    const granted = readPermissionList(body, 'grantedPermissions') ?? [];
    const revoked = readPermissionList(body, 'revokedPermissions') ?? [];
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role,
        passwordChangedAt: new Date(),
        passwordChangedById: req.user?.id ?? null,
        passwordChangedByName: req.user?.username ?? null,
        // Одно и то же право не может быть одновременно выдано и отозвано.
        grantedPermissions: granted.filter((permission) => !revoked.includes(permission)),
        revokedPermissions: revoked,
      },
    });

    res.status(201).json({ user: serializeUser(user) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      next(httpError('Пользователь с таким логином уже существует', 409));
      return;
    }
    next(error);
  }
});

usersRouter.patch('/:id', async (req, res, next) => {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });

    if (!target) {
      throw httpError('Пользователь не найден', 404);
    }
    if (target.id === req.user?.id) {
      throw httpError('Нельзя изменять собственную учётную запись', 400);
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const currentRole: Role = isRole(target.role) ? target.role : 'viewer';
    const role = readRole(body, currentRole) ?? currentRole;
    const password = readString(body, 'password') !== undefined ? readPassword(body) : undefined;
    const granted = readPermissionList(body, 'grantedPermissions');
    const revoked = readPermissionList(body, 'revokedPermissions');
    const roleChanged = role !== currentRole;

    if (roleChanged && currentRole === 'admin' && (await countAdmins()) <= 1) {
      throw httpError('Нельзя изменить роль последнего администратора', 400);
    }

    const nextRevoked = revoked ?? target.revokedPermissions;
    const nextGranted = (granted ?? target.grantedPermissions).filter(
      (permission) => !nextRevoked.includes(permission),
    );

    const data: Prisma.UserUpdateInput = {
      role,
      grantedPermissions: nextGranted,
      revokedPermissions: nextRevoked,
    };

    if (password) {
      data.passwordHash = await hashPassword(password);
      data.passwordChangedAt = new Date();
      data.passwordChangedById = req.user?.id ?? null;
      data.passwordChangedByName = req.user?.username ?? null;
    }

    const updated = await prisma.user.update({ where: { id: target.id }, data });

    // Смена пароля/роли — повод перелогиниться; изменение прав применяется сразу.
    if (roleChanged || password) {
      await deleteUserSessions(target.id);
    }

    res.json({ user: serializeUser(updated) });
  } catch (error) {
    next(error);
  }
});

usersRouter.delete('/:id', async (req, res, next) => {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });

    if (!target) {
      throw httpError('Пользователь не найден', 404);
    }
    if (target.id === req.user?.id) {
      throw httpError('Нельзя удалить собственную учётную запись', 400);
    }
    if (target.role === 'admin' && (await countAdmins()) <= 1) {
      throw httpError('Нельзя удалить последнего администратора', 400);
    }

    await prisma.user.delete({ where: { id: target.id } });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

usersRouter.post('/:id/logout', async (req, res, next) => {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });

    if (!target) {
      throw httpError('Пользователь не найден', 404);
    }

    await deleteUserSessions(target.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});
