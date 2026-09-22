import { query } from '../../db/index.js';

export interface CountRow {
  label: string;
  count: number;
}

export interface LabelCountRow extends CountRow {
  color: string | null;
}

export interface ReportSummary {
  total: number;
  active: number;
  superseded: number;
  byAffect: CountRow[];
  byModule: CountRow[];
  byLabel: LabelCountRow[];
  topDeciders: CountRow[];
  topCreators: CountRow[];
  byMonth: CountRow[];
}

const SUPERSEDED_EXPR = `EXISTS (
  SELECT 1 FROM record_links rk JOIN link_types lt ON lt.id = rk.link_type_id
  WHERE rk.to_record = r.id AND lt.is_supersede)`;

export const reportsService = {
  /** Kararlarla ilgili toplu raporlama verisini üretir. */
  async summary(): Promise<ReportSummary> {
    const [totalRow] = await query<{ total: string }>('SELECT count(*)::text AS total FROM records');
    const total = Number(totalRow?.total ?? 0);

    const [supRow] = await query<{ superseded: string }>(
      `SELECT count(*)::text AS superseded FROM records r WHERE ${SUPERSEDED_EXPR}`,
    );
    const superseded = Number(supRow?.superseded ?? 0);

    const byAffect = await query<CountRow>(
      `SELECT unnest(affects) AS label, count(*)::int AS count
       FROM records GROUP BY 1 ORDER BY count DESC`,
    );

    const byModule = await query<CountRow>(
      `SELECT m.name AS label, count(*)::int AS count
       FROM record_modules rm JOIN modules m ON m.id = rm.module_id
       GROUP BY m.name ORDER BY count DESC, m.name ASC LIMIT 15`,
    );

    const byLabel = await query<LabelCountRow>(
      `SELECT l.name AS label, l.color, count(*)::int AS count
       FROM record_labels rl JOIN labels l ON l.id = rl.label_id
       GROUP BY l.name, l.color ORDER BY count DESC, l.name ASC LIMIT 15`,
    );

    const topDeciders = await query<CountRow>(
      `SELECT p.full_name AS label, count(*)::int AS count
       FROM record_deciders rd JOIN persons p ON p.id = rd.person_id
       GROUP BY p.full_name ORDER BY count DESC, p.full_name ASC LIMIT 15`,
    );

    const topCreators = await query<CountRow>(
      `SELECT u.full_name AS label, count(*)::int AS count
       FROM records r JOIN users u ON u.id = r.created_by
       GROUP BY u.full_name ORDER BY count DESC, u.full_name ASC LIMIT 15`,
    );

    const byMonth = await query<CountRow>(
      `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS label, count(*)::int AS count
       FROM records
       WHERE created_at >= date_trunc('month', now()) - interval '11 months'
       GROUP BY 1 ORDER BY 1 ASC`,
    );

    return {
      total,
      superseded,
      active: total - superseded,
      byAffect,
      byModule,
      byLabel,
      topDeciders,
      topCreators,
      byMonth,
    };
  },
};
