import { prisma } from '../db';

/**
 * Гарантирует ровно одного главного администратора среди роли admin.
 * Если после миграции флаг ещё не выставлен, им становится самый первый admin.
 */
export async function ensureOwner(): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: 'admin' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, username: true, isOwner: true },
  });

  if (admins.length === 0) {
    return;
  }

  const owner = admins.find((admin) => admin.isOwner) ?? admins[0];
  const needsUpdate =
    !owner.isOwner || admins.some((admin) => admin.id !== owner.id && admin.isOwner);

  if (!needsUpdate) {
    return;
  }

  await prisma.$transaction([
    prisma.user.updateMany({
      where: { role: 'admin', id: { not: owner.id } },
      data: { isOwner: false },
    }),
    prisma.user.update({
      where: { id: owner.id },
      data: { isOwner: true },
    }),
  ]);

  console.log(`[owner] главный администратор: ${owner.username}`);
}
