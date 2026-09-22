import pg from 'pg';
import { pool, query } from '../../db/index.js';

/** Sorgu çalıştırabilen bağlam: havuz ya da transaction istemcisi. */
type Queryable = pg.Pool | pg.PoolClient;

/** Kayıt içindeki kişi referansı (şahit/karar veren). */
export interface RecordPerson {
  id: string;
  fullName: string;
}

export interface RecordLabel {
  id: string;
  name: string;
  color: string | null;
}

export interface RecordModule {
  id: string;
  name: string;
}

/** Kayıt detayında gösterilen tek bir bağlantı (yön farkındalıklı). */
export interface RecordLinkView {
  id: string;
  direction: 'out' | 'in';
  typeId: string;
  typeLabel: string;
  color: string | null;
  isSupersede: boolean;
  createdAt: string;
  by: string;
  record: { id: string; refNo: number; decision: string };
}

/** Listede kullanılan hafif kayıt görünümü (bağlantı listesi olmadan). */
export interface RecordSummary {
  id: string;
  refNo: number;
  decision: string;
  rationale: string;
  affects: string[];
  createdAt: string;
  createdBy: RecordPerson;
  modules: RecordModule[];
  witnesses: RecordPerson[];
  deciders: RecordPerson[];
  labels: RecordLabel[];
  isSuperseded: boolean;
}

/** Detay görünümü: özet + tüm bağlantılar. */
export interface RecordDetail extends RecordSummary {
  links: RecordLinkView[];
}

export interface RecordSearchFilters {
  q: string;
  affects: string[];
  labelIds: string[];
  moduleIds: string[];
  personId: string | null;
  createdBy: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  status: 'all' | 'active' | 'superseded';
  limit: number;
  offset: number;
}

export interface RecordSearchResult {
  items: RecordSummary[];
  total: number;
}

/** Liste/özet projeksiyonu — tüm ilişkiler tek biçimde çözülür. */
const SUMMARY_PROJECTION = `
  r.id,
  r.ref_no::int AS "refNo",
  r.decision,
  r.rationale,
  r.affects,
  r.created_at AS "createdAt",
  json_build_object('id', u.id, 'fullName', u.full_name) AS "createdBy",
  COALESCE((
    SELECT json_agg(json_build_object('id', m.id, 'name', m.name) ORDER BY lower(m.name))
    FROM record_modules rm JOIN modules m ON m.id = rm.module_id
    WHERE rm.record_id = r.id), '[]') AS modules,
  COALESCE((
    SELECT json_agg(json_build_object('id', p.id, 'fullName', p.full_name) ORDER BY p.full_name)
    FROM record_witnesses rw JOIN persons p ON p.id = rw.person_id
    WHERE rw.record_id = r.id), '[]') AS witnesses,
  COALESCE((
    SELECT json_agg(json_build_object('id', p.id, 'fullName', p.full_name) ORDER BY p.full_name)
    FROM record_deciders rd JOIN persons p ON p.id = rd.person_id
    WHERE rd.record_id = r.id), '[]') AS deciders,
  COALESCE((
    SELECT json_agg(json_build_object('id', l.id, 'name', l.name, 'color', l.color) ORDER BY lower(l.name))
    FROM record_labels rl JOIN labels l ON l.id = rl.label_id
    WHERE rl.record_id = r.id), '[]') AS labels,
  EXISTS (
    SELECT 1 FROM record_links rk JOIN link_types lt ON lt.id = rk.link_type_id
    WHERE rk.to_record = r.id AND lt.is_supersede
  ) AS "isSuperseded"
`;

/** Detay için bağlantı listesi (giden + gelen, yöne göre etiketlenmiş). */
const LINKS_PROJECTION = `
  COALESCE((
    SELECT json_agg(link ORDER BY link->>'createdAt')
    FROM (
      SELECT json_build_object(
        'id', rk.id, 'direction', 'out', 'typeId', lt.id,
        'typeLabel', lt.forward_name, 'color', lt.color, 'isSupersede', lt.is_supersede,
        'createdAt', rk.created_at, 'by', bu.full_name,
        'record', json_build_object('id', t.id, 'refNo', t.ref_no::int, 'decision', t.decision)
      ) AS link
      FROM record_links rk
      JOIN link_types lt ON lt.id = rk.link_type_id
      JOIN records t ON t.id = rk.to_record
      JOIN users bu ON bu.id = rk.created_by
      WHERE rk.from_record = r.id
      UNION ALL
      SELECT json_build_object(
        'id', rk.id, 'direction', 'in', 'typeId', lt.id,
        'typeLabel', lt.inverse_name, 'color', lt.color, 'isSupersede', lt.is_supersede,
        'createdAt', rk.created_at, 'by', bu.full_name,
        'record', json_build_object('id', f.id, 'refNo', f.ref_no::int, 'decision', f.decision)
      ) AS link
      FROM record_links rk
      JOIN link_types lt ON lt.id = rk.link_type_id
      JOIN records f ON f.id = rk.from_record
      JOIN users bu ON bu.id = rk.created_by
      WHERE rk.to_record = r.id
    ) links
  ), '[]') AS links
`;

const RECORD_FROM = `FROM records r JOIN users u ON u.id = r.created_by`;

export const recordsRepository = {
  async findById(id: string): Promise<RecordDetail | null> {
    const rows = await query<RecordDetail>(
      `SELECT ${SUMMARY_PROJECTION}, ${LINKS_PROJECTION} ${RECORD_FROM} WHERE r.id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  },

  async search(filters: RecordSearchFilters): Promise<RecordSearchResult> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    const bind = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };

    if (filters.q.trim().length > 0) {
      const p = bind(filters.q.trim());
      conditions.push(
        `(r.search_tsv @@ websearch_to_tsquery('turkish', ${p})
          OR r.decision ILIKE '%' || ${p} || '%'
          OR r.rationale ILIKE '%' || ${p} || '%')`,
      );
    }
    if (filters.affects.length > 0) {
      conditions.push(`r.affects && ${bind(filters.affects)}`);
    }
    if (filters.labelIds.length > 0) {
      conditions.push(
        `EXISTS (SELECT 1 FROM record_labels rl WHERE rl.record_id = r.id AND rl.label_id = ANY(${bind(filters.labelIds)}))`,
      );
    }
    if (filters.moduleIds.length > 0) {
      conditions.push(
        `EXISTS (SELECT 1 FROM record_modules rm WHERE rm.record_id = r.id AND rm.module_id = ANY(${bind(filters.moduleIds)}))`,
      );
    }
    if (filters.personId) {
      const p = bind(filters.personId);
      conditions.push(
        `(EXISTS (SELECT 1 FROM record_witnesses rw WHERE rw.record_id = r.id AND rw.person_id = ${p})
          OR EXISTS (SELECT 1 FROM record_deciders rd WHERE rd.record_id = r.id AND rd.person_id = ${p}))`,
      );
    }
    if (filters.createdBy) {
      conditions.push(`r.created_by = ${bind(filters.createdBy)}`);
    }
    if (filters.dateFrom) {
      conditions.push(`r.created_at >= ${bind(filters.dateFrom)}`);
    }
    if (filters.dateTo) {
      conditions.push(`r.created_at <= ${bind(filters.dateTo)}`);
    }

    const supersededExpr = `EXISTS (
      SELECT 1 FROM record_links rk JOIN link_types lt ON lt.id = rk.link_type_id
      WHERE rk.to_record = r.id AND lt.is_supersede)`;
    if (filters.status === 'active') {
      conditions.push(`NOT ${supersededExpr}`);
    } else if (filters.status === 'superseded') {
      conditions.push(supersededExpr);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const totalRows = await query<{ total: string }>(
      `SELECT count(*)::text AS total ${RECORD_FROM} ${where}`,
      params,
    );
    const total = Number(totalRows[0]?.total ?? 0);

    const items = await query<RecordSummary>(
      `SELECT ${SUMMARY_PROJECTION} ${RECORD_FROM} ${where}
       ORDER BY r.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, filters.limit, filters.offset],
    );

    return { items, total };
  },

  async insert(
    client: pg.PoolClient,
    input: { decision: string; rationale: string; affects: string[]; createdBy: string },
  ): Promise<string> {
    const result = await client.query<{ id: string }>(
      `INSERT INTO records (decision, rationale, affects, created_by)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [input.decision, input.rationale, input.affects, input.createdBy],
    );
    return result.rows[0]!.id;
  },

  async linkWitnesses(client: pg.PoolClient, recordId: string, personIds: readonly string[]): Promise<void> {
    for (const personId of personIds) {
      await client.query(
        'INSERT INTO record_witnesses (record_id, person_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [recordId, personId],
      );
    }
  },

  async linkDeciders(client: pg.PoolClient, recordId: string, personIds: readonly string[]): Promise<void> {
    for (const personId of personIds) {
      await client.query(
        'INSERT INTO record_deciders (record_id, person_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [recordId, personId],
      );
    }
  },

  async linkLabels(client: pg.PoolClient, recordId: string, labelIds: readonly string[]): Promise<void> {
    for (const labelId of labelIds) {
      await client.query(
        'INSERT INTO record_labels (record_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [recordId, labelId],
      );
    }
  },

  async linkModules(client: pg.PoolClient, recordId: string, moduleIds: readonly string[]): Promise<void> {
    for (const moduleId of moduleIds) {
      await client.query(
        'INSERT INTO record_modules (record_id, module_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [recordId, moduleId],
      );
    }
  },

  async exists(id: string): Promise<boolean> {
    const rows = await query<{ exists: boolean }>(
      'SELECT EXISTS (SELECT 1 FROM records WHERE id = $1) AS exists',
      [id],
    );
    return rows[0]?.exists ?? false;
  },

  /**
   * Yeni bir kayıt bağlantısı ekler; çakışma varsa mevcut id'yi döndürür.
   * `runner` transaction istemcisi (oluşturma anı) ya da havuz (sonradan) olabilir.
   */
  async addLink(
    runner: Queryable,
    input: { fromRecord: string; toRecord: string; linkTypeId: string; createdBy: string },
  ): Promise<string> {
    const inserted = await runner.query<{ id: string }>(
      `INSERT INTO record_links (from_record, to_record, link_type_id, created_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (from_record, to_record, link_type_id) DO NOTHING
       RETURNING id`,
      [input.fromRecord, input.toRecord, input.linkTypeId, input.createdBy],
    );
    if (inserted.rows[0]) return inserted.rows[0].id;
    const existing = await runner.query<{ id: string }>(
      `SELECT id FROM record_links
       WHERE from_record = $1 AND to_record = $2 AND link_type_id = $3 LIMIT 1`,
      [input.fromRecord, input.toRecord, input.linkTypeId],
    );
    return existing.rows[0]!.id;
  },

  async removeLink(linkId: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM record_links WHERE id = $1', [linkId]);
    return (result.rowCount ?? 0) > 0;
  },
};
