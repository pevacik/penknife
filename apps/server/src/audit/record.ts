import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId?: string | null;
  productId?: string | null;
  title?: string;
  details?: Prisma.InputJsonValue;
  actorId?: string | null;
  actorName?: string;
}

/**
 * Пишет событие в журнал. Ошибка аудита не должна ломать основную операцию:
 * действие пользователя уже выполнено, а проблему видно в серверном логе.
 */
export async function recordAudit(req: Request, entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        productId: entry.productId ?? null,
        actorId: entry.actorId ?? req.user?.id ?? null,
        actorName: entry.actorName ?? req.user?.username ?? '',
        title: entry.title ?? '',
        details: entry.details ?? Prisma.JsonNull,
        ip: req.ip ?? null,
        userAgent: req.get('user-agent')?.slice(0, 300) ?? null,
      },
    });
  } catch (error) {
    console.error('[audit] не удалось записать событие:', entry.action, error);
  }
}
