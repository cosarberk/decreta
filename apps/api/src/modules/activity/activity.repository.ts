import { query } from '../../db/index.js';

export interface ActivityRow {
  id: string;
  action: string;
  actor_id: string | null;
  actor_name: string;
  target_ref: string | null;
  target_text: string | null;
  record_id: string | null;
  created_at: string;
}

export interface ActivityFilters {
  q: string;
  action: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  limit: number;
  offset: number;
}

/** WHERE parçalarını ve parametreleri tek yerde kurar. */
function buildWhere(filters: ActivityFilters): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  const bind = (v: unknown): string => {
    params.push(v);
    return `$${params.length}`;
  };
  if (filters.q.trim().length > 0) {
    const p = bind(`%${filters.q.trim()}%`);
    conditions.push(`(actor_name ILIKE ${p} OR target_ref ILIKE ${p} OR target_text ILIKE ${p})`);
  }
  if (filters.action) conditions.push(`action = ${bind(filters.action)}`);
  if (filters.dateFrom) conditions.push(`created_at >= ${bind(filters.dateFrom)}`);
  if (filters.dateTo) conditions.push(`created_at <= ${bind(filters.dateTo)}`);
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

export const activityRepository = {
  async insert(entry: {
    action: string;
    actorId: string | null;
    actorName: string;
    targetRef: string | null;
    targetText: string | null;
    recordId: string | null;
  }): Promise<void> {
    await query(
      `INSERT INTO activity_log (action, actor_id, actor_name, target_ref, target_text, record_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [entry.action, entry.actorId, entry.actorName, entry.targetRef, entry.targetText, entry.recordId],
    );
  },

  async search(filters: ActivityFilters): Promise<{ items: ActivityRow[]; total: number }> {
    const { where, params } = buildWhere(filters);
    const totalRows = await query<{ total: string }>(
      `SELECT count(*)::text AS total FROM activity_log ${where}`,
      params,
    );
    const items = await query<ActivityRow>(
      `SELECT * FROM activity_log ${where} ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, filters.limit, filters.offset],
    );
    return { items, total: Number(totalRows[0]?.total ?? 0) };
  },

  /** Export için filtreye uyan tüm satırlar (üst sınırla korunur). */
  async findAll(filters: Omit<ActivityFilters, 'limit' | 'offset'>): Promise<ActivityRow[]> {
    const { where, params } = buildWhere({ ...filters, limit: 0, offset: 0 });
    return query<ActivityRow>(
      `SELECT * FROM activity_log ${where} ORDER BY created_at DESC LIMIT 50000`,
      params,
    );
  },

  async distinctActions(): Promise<string[]> {
    const rows = await query<{ action: string }>(
      'SELECT DISTINCT action FROM activity_log ORDER BY action',
    );
    return rows.map((r) => r.action);
  },
};
