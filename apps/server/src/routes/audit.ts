import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../db';
import { httpError } from '../httpError';
import { requirePermission } from '../middleware/requirePermission';

export const auditRouter = Router();

auditRouter.use(requirePermission('viewAudit'));

function parseDate(value: unknown, field: string): Date | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw httpError(`Некорректная дата в поле ${field}`);
  }

  return date;
}

function positiveInt(value: unknown, fallback: number, max: number): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return fallback;
  }
  return Math.min(max, Math.floor(number));
}

function buildWhere(query: Record<string, unknown>): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};
  const action = typeof query.action === 'string' ? query.action.trim() : '';
  const actorId = typeof query.actorId === 'string' ? query.actorId.trim() : '';
  const productId = typeof query.productId === 'string' ? query.productId.trim() : '';
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const from = parseDate(query.from, 'from');
  const to = parseDate(query.to, 'to');

  if (action) {
    // action=product вернёт product.create, product.update и т.д.
    where.OR = [{ action }, { action: { startsWith: `${action}.` } }];
  }
  if (actorId) {
    where.actorId = actorId;
  }
  if (productId) {
    where.productId = productId;
  }
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }
  if (search) {
    where.AND = [
      {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { actorName: { contains: search, mode: 'insensitive' } },
        ],
      },
    ];
  }

  return where;
}

auditRouter.get('/', async (req, res, next) => {
  try {
    const page = positiveInt(req.query.page, 1, 100000);
    const limit = positiveInt(req.query.limit, 50, 100);
    const where = buildWhere(req.query as Record<string, unknown>);

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ items, total, page, limit, hasMore: page * limit < total });
  } catch (error) {
    next(error);
  }
});

auditRouter.get('/stats', async (req, res, next) => {
  try {
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const from = parseDate(req.query.from, 'from') ?? defaultFrom;
    const to = parseDate(req.query.to, 'to') ?? now;
    const where: Prisma.AuditLogWhereInput = {
      ...buildWhere(req.query as Record<string, unknown>),
      createdAt: { gte: from, lte: to },
    };

    const [groups, byUserGroups, rows] = await Promise.all([
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { _all: true },
      }),
      prisma.auditLog.groupBy({
        by: ['actorId', 'actorName'],
        where,
        _count: { _all: true },
      }),
      prisma.auditLog.findMany({
        where,
        select: { createdAt: true, action: true },
      }),
    ]);

    const countOf = (action: string): number =>
      groups.find((group) => group.action === action)?._count._all ?? 0;

    const totals = {
      productCreated: countOf('product.create'),
      productUpdated: countOf('product.update'),
      productDeleted: countOf('product.delete'),
      commentCreated: countOf('comment.create'),
      commentUpdated: countOf('comment.update'),
      commentDeleted: countOf('comment.delete'),
      imagesAdded: countOf('product.image.add'),
      imagesDeleted: countOf('product.image.delete') + countOf('comment.image.delete'),
      usersChanged:
        countOf('user.create') +
        countOf('user.update') +
        countOf('user.delete') +
        countOf('auth.password_change'),
      logins: countOf('auth.login'),
      loginsFailed: countOf('auth.login_failed'),
    };

    const byUser = byUserGroups
      .map((group) => ({
        actorId: group.actorId,
        actorName: group.actorName || 'неизвестно',
        count: group._count._all,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const byDayMap = new Map<string, Record<string, number>>();
    for (const row of rows) {
      const date = row.createdAt.toISOString().slice(0, 10);
      const day = byDayMap.get(date) ?? {};
      day[row.action] = (day[row.action] ?? 0) + 1;
      byDayMap.set(date, day);
    }

    const byDay = [...byDayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, actions]) => ({ date, actions }));

    res.json({
      from: from.toISOString(),
      to: to.toISOString(),
      totals,
      actions: groups
        .map((group) => ({ action: group.action, count: group._count._all }))
        .sort((a, b) => b.count - a.count),
      byUser,
      byDay,
    });
  } catch (error) {
    next(error);
  }
});
