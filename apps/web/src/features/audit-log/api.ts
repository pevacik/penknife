import { httpClient } from '@/shared/api/httpClient';

export interface AuditLogEntry {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string | null;
  productId: string | null;
  actorId: string | null;
  actorName: string;
  title: string;
  details: unknown;
  ip: string | null;
  userAgent: string | null;
}

export interface AuditListResponse {
  items: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface AuditStats {
  from: string;
  to: string;
  totals: Record<string, number>;
  actions: Array<{ action: string; count: number }>;
  byUser: Array<{ actorId: string | null; actorName: string; count: number }>;
  byDay: Array<{ date: string; actions: Record<string, number> }>;
}

export interface AuditQuery {
  action?: string;
  search?: string;
  from?: string;
  to?: string;
  productId?: string;
  page?: number;
  limit?: number;
}

function toSearchParams(query: AuditQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

export const auditApi = {
  list(query: AuditQuery): Promise<AuditListResponse> {
    return httpClient.get<AuditListResponse>(`/audit?${toSearchParams(query)}`);
  },
  stats(query: Pick<AuditQuery, 'from' | 'to' | 'action' | 'search' | 'productId'>): Promise<AuditStats> {
    return httpClient.get<AuditStats>(`/audit/stats?${toSearchParams(query)}`);
  },
};
