import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { hashPassword } from '../src/auth/password';
import { isOverridablePermission, isPermission } from '../src/auth/permissions';
import { isRole, ROLES } from '../src/auth/roles';
import type { Role } from '../src/auth/roles';
import { deleteUserSessions } from '../src/auth/session';
import { prisma } from '../src/db';

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;
const MIN_PASSWORD_LENGTH = 12;

async function readPassword(question: string): Promise<string> {
  if (!process.stdin.isTTY) {
    throw new Error('Нет интерактивного терминала: задайте ADMIN_PASSWORD или --password=...');
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const internal = rl as unknown as { _writeToOutput?: (value: string) => void };
  const originalWrite = internal._writeToOutput;

  internal._writeToOutput = () => undefined;
  process.stdout.write(question);

  try {
    return await rl.question('');
  } finally {
    internal._writeToOutput = originalWrite;
    rl.close();
    process.stdout.write('\n');
  }
}

function getArg(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(`--${name}`);
}

function parseRole(value: string | undefined): Role | null {
  if (!value) {
    return null;
  }
  if (!isRole(value)) {
    throw new Error(`Роль должна быть одной из: ${ROLES.join(', ')}`);
  }
  return value;
}

function parsePermissionList(value: string | undefined): string[] | null {
  if (value === undefined) {
    return null;
  }

  const permissions = value
    .split(',')
    .map((permission) => permission.trim())
    .filter(Boolean);

  for (const permission of permissions) {
    if (!isPermission(permission)) {
      throw new Error(`Неизвестное право: ${permission}`);
    }
    if (!isOverridablePermission(permission)) {
      throw new Error(`Право ${permission} нельзя переопределять`);
    }
  }

  return [...new Set(permissions)];
}

async function listUsers(): Promise<void> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      username: true,
      role: true,
      grantedPermissions: true,
      revokedPermissions: true,
      createdAt: true,
      _count: { select: { sessions: true } },
    },
  });

  if (users.length === 0) {
    console.log('[user] пользователей нет');
    return;
  }

  console.log('Логин\tРоль\tДоп.права\tОтозвано\tСессий\tСоздан');
  for (const user of users) {
    console.log(
      [
        user.username,
        user.role,
        user.grantedPermissions.join(',') || '—',
        user.revokedPermissions.join(',') || '—',
        user._count.sessions,
        user.createdAt.toISOString(),
      ].join('\t'),
    );
  }
}

async function deleteUser(username: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    throw new Error(`Пользователь ${username} не найден`);
  }

  if (user.role === 'admin') {
    const admins = await prisma.user.count({ where: { role: 'admin' } });
    if (admins <= 1) {
      throw new Error('Нельзя удалить последнего администратора');
    }
  }

  await prisma.user.delete({ where: { id: user.id } });
  console.log(`[user] удалён: ${username}`);
}

async function main() {
  const args = process.argv.slice(2);

  if (hasFlag(args, 'list')) {
    await listUsers();
    return;
  }

  const usernameToDelete = getArg(args, 'delete');
  if (usernameToDelete) {
    await deleteUser(usernameToDelete);
    return;
  }

  const username = args.find((arg) => !arg.startsWith('--'))?.trim();

  if (!username) {
    throw new Error(
      'Укажите логин: npm run user:create --workspace server -- <логин> [--role=admin|user|viewer]',
    );
  }
  if (!USERNAME_PATTERN.test(username)) {
    throw new Error('Логин: 3–32 символа, только латиница, цифры, точка, дефис и подчёркивание');
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  const explicitRole = parseRole(getArg(args, 'role'));

  // Без --role: у существующего пользователя роль сохраняется, первый в пустой БД
  // становится админом, остальные — обычными пользователями.
  const role: Role =
    explicitRole ??
    (existing
      ? isRole(existing.role)
        ? existing.role
        : 'viewer'
      : (await prisma.user.count()) === 0
        ? 'admin'
        : 'user');

  const passwordFromArgs = getArg(args, 'password');
  const grantArg = parsePermissionList(getArg(args, 'grant'));
  const revokeArg = parsePermissionList(getArg(args, 'revoke'));

  let granted = existing?.grantedPermissions ?? [];
  let revoked = existing?.revokedPermissions ?? [];

  if (grantArg) {
    revoked = revoked.filter((permission) => !grantArg.includes(permission));
    granted = [...new Set([...granted, ...grantArg])];
  }
  if (revokeArg) {
    granted = granted.filter((permission) => !revokeArg.includes(permission));
    revoked = [...new Set([...revoked, ...revokeArg])];
  }

  const password = passwordFromArgs ?? process.env.ADMIN_PASSWORD ?? (await readPassword('Пароль: '));

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`);
  }

  const passwordHash = await hashPassword(password);
  const passwordChangedAt = new Date();
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          role,
          grantedPermissions: granted,
          revokedPermissions: revoked,
          passwordChangedAt,
          passwordChangedById: null,
          passwordChangedByName: 'CLI',
        },
      })
    : await prisma.user.create({
        data: {
          username,
          passwordHash,
          role,
          grantedPermissions: granted,
          revokedPermissions: revoked,
          passwordChangedAt,
          passwordChangedById: null,
          passwordChangedByName: 'CLI',
        },
      });

  // Смена пароля/роли разлогинивает все прежние сессии этого пользователя.
  await deleteUserSessions(user.id);

  console.log(`[user] сохранён: ${user.username} (id: ${user.id}, роль: ${user.role})`);
}

void main()
  .catch((error) => {
    console.error('[user] ошибка:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
