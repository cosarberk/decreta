/** Etkilenen alan — kaydın açılma eşiği olan üç boyut. */
export const AFFECTS = ['analiz', 'test', 'kod'] as const;
export type Affect = (typeof AFFECTS)[number];

export type Role = 'admin' | 'user';

export interface AuthUserInfo {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

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

/** Bir kaydın detayında gösterilen tek bir bağlantı (yön farkındalıklı). */
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

/** Listede kullanılan hafif kayıt görünümü. */
export interface RecordSummary {
  id: string;
  refNo: number;
  decision: string;
  rationale: string;
  affects: Affect[];
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

export interface RecordSearchResponse {
  items: RecordSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface LabelWithUsage {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  created_at: string;
  usage_count: number;
}

export interface ModuleWithUsage {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  usage_count: number;
}

export interface LinkType {
  id: string;
  forward_name: string;
  inverse_name: string;
  color: string | null;
  is_supersede: boolean;
  description: string | null;
  created_at: string;
}

export interface ActivityItem {
  id: string;
  action: string;
  actor_name: string;
  target_ref: string | null;
  target_text: string | null;
  record_id: string | null;
  created_at: string;
}

export interface ActivitySearchResponse {
  items: ActivityItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

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

export interface EmailTemplate {
  key: string;
  subject: string;
  body_html: string;
  updated_at: string;
  variables: string[];
}

export interface PublicUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  available_as_person: boolean;
  created_at: string;
  updated_at: string;
}

/** Oluşturma anında eklenecek bağlantı. */
export interface LinkInput {
  toRecordId: string;
  linkTypeId: string;
}

/** Kayıt oluşturma isteği gövdesi. */
export interface CreateRecordPayload {
  decision: string;
  rationale: string;
  affects: Affect[];
  modules: string[];
  witnesses: string[];
  deciders: string[];
  labels: string[];
  links: LinkInput[];
}
