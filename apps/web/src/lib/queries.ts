import { apiGetText, apiRequest, apiStream } from './api';
import type {
  ActivitySearchResponse,
  Affect,
  CreateRecordPayload,
  EmailTemplate,
  ReportSummary,
  LabelWithUsage,
  LinkInput,
  LinkType,
  ModuleWithUsage,
  PublicUser,
  RecordDetail,
  RecordSearchResponse,
  Role,
} from './types';

export interface RecordFilters {
  q: string;
  affects: Affect[];
  labels: string[];
  modules: string[];
  personId: string | null;
  createdBy: string | null;
  status: 'all' | 'active' | 'superseded';
  page: number;
  pageSize: number;
}

interface PersonRow {
  id: string;
  full_name: string;
  created_at: string;
}

/** Uygulamanın tüm sunucu çağrıları tek yerde toplanır. */
export const api = {
  searchRecords(filters: RecordFilters): Promise<RecordSearchResponse> {
    return apiRequest<RecordSearchResponse>('/records', {
      query: {
        q: filters.q,
        affects: filters.affects,
        labels: filters.labels,
        modules: filters.modules,
        personId: filters.personId,
        createdBy: filters.createdBy,
        status: filters.status,
        page: filters.page,
        pageSize: filters.pageSize,
      },
    });
  },

  getRecord(id: string): Promise<RecordDetail> {
    return apiRequest<RecordDetail>(`/records/${id}`);
  },

  createRecord(payload: CreateRecordPayload): Promise<RecordDetail> {
    return apiRequest<RecordDetail>('/records', { method: 'POST', body: payload });
  },

  addLink(recordId: string, link: LinkInput): Promise<RecordDetail> {
    return apiRequest<RecordDetail>(`/records/${recordId}/links`, { method: 'POST', body: link });
  },

  removeLink(recordId: string, linkId: string): Promise<void> {
    return apiRequest<void>(`/records/${recordId}/links/${linkId}`, { method: 'DELETE' });
  },

  listLabels(): Promise<LabelWithUsage[]> {
    return apiRequest<LabelWithUsage[]>('/labels');
  },

  createLabel(name: string, color?: string, description?: string): Promise<LabelWithUsage> {
    return apiRequest<LabelWithUsage>('/labels', { method: 'POST', body: { name, color, description } });
  },

  updateLabel(
    id: string,
    name: string,
    color?: string | null,
    description?: string | null,
  ): Promise<LabelWithUsage> {
    return apiRequest<LabelWithUsage>(`/labels/${id}`, {
      method: 'PATCH',
      body: { name, color, description },
    });
  },

  deleteLabel(id: string): Promise<void> {
    return apiRequest<void>(`/labels/${id}`, { method: 'DELETE' });
  },

  mergeLabel(id: string, intoId: string): Promise<void> {
    return apiRequest<void>(`/labels/${id}/merge`, { method: 'POST', body: { intoId } });
  },

  listModules(): Promise<ModuleWithUsage[]> {
    return apiRequest<ModuleWithUsage[]>('/modules');
  },

  createModule(name: string, description?: string): Promise<ModuleWithUsage> {
    return apiRequest<ModuleWithUsage>('/modules', { method: 'POST', body: { name, description } });
  },

  updateModule(id: string, name: string, description?: string | null): Promise<ModuleWithUsage> {
    return apiRequest<ModuleWithUsage>(`/modules/${id}`, {
      method: 'PATCH',
      body: { name, description },
    });
  },

  deleteModule(id: string): Promise<void> {
    return apiRequest<void>(`/modules/${id}`, { method: 'DELETE' });
  },

  mergeModule(id: string, intoId: string): Promise<void> {
    return apiRequest<void>(`/modules/${id}/merge`, { method: 'POST', body: { intoId } });
  },

  listLinkTypes(): Promise<LinkType[]> {
    return apiRequest<LinkType[]>('/link-types');
  },

  createLinkType(input: {
    forwardName: string;
    inverseName: string;
    color?: string;
    isSupersede: boolean;
    description?: string;
  }): Promise<LinkType> {
    return apiRequest<LinkType>('/link-types', { method: 'POST', body: input });
  },

  updateLinkType(
    id: string,
    input: {
      forwardName: string;
      inverseName: string;
      color?: string;
      isSupersede: boolean;
      description?: string;
    },
  ): Promise<LinkType> {
    return apiRequest<LinkType>(`/link-types/${id}`, { method: 'PATCH', body: input });
  },

  deleteLinkType(id: string): Promise<void> {
    return apiRequest<void>(`/link-types/${id}`, { method: 'DELETE' });
  },

  mergeLinkType(id: string, intoId: string): Promise<void> {
    return apiRequest<void>(`/link-types/${id}/merge`, { method: 'POST', body: { intoId } });
  },

  async searchPersons(query: string): Promise<string[]> {
    const rows = await apiRequest<PersonRow[]>('/persons', { query: { q: query, limit: 20 } });
    return rows.map((row) => row.full_name);
  },

  async searchPersonsFull(query: string): Promise<{ id: string; fullName: string }[]> {
    const rows = await apiRequest<PersonRow[]>('/persons', { query: { q: query, limit: 10 } });
    return rows.map((row) => ({ id: row.id, fullName: row.full_name }));
  },

  /** Karar veren/şahit önerisi: mevcut kişiler + bulunabilir kullanıcılar birleşimi. */
  searchPersonSuggestions(query: string): Promise<string[]> {
    return apiRequest<string[]>('/persons/suggest', { query: { q: query, limit: 20 } });
  },

  updateProfile(fullName: string): Promise<PublicUser> {
    return apiRequest<PublicUser>('/auth/me', { method: 'PATCH', body: { fullName } });
  },

  changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return apiRequest<void>('/auth/me/password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    });
  },

  listUsers(): Promise<PublicUser[]> {
    return apiRequest<PublicUser[]>('/users');
  },

  createUser(input: {
    email: string;
    password: string;
    fullName: string;
    role: Role;
  }): Promise<PublicUser> {
    return apiRequest<PublicUser>('/users', { method: 'POST', body: input });
  },

  setUserActive(id: string, isActive: boolean): Promise<PublicUser> {
    return apiRequest<PublicUser>(`/users/${id}/active`, { method: 'PATCH', body: { isActive } });
  },

  setUserRole(id: string, role: Role): Promise<PublicUser> {
    return apiRequest<PublicUser>(`/users/${id}/role`, { method: 'PATCH', body: { role } });
  },

  setUserAvailability(id: string, available: boolean): Promise<PublicUser> {
    return apiRequest<PublicUser>(`/users/${id}/availability`, {
      method: 'PATCH',
      body: { available },
    });
  },

  updateUser(id: string, fullName: string, email: string): Promise<PublicUser> {
    return apiRequest<PublicUser>(`/users/${id}`, { method: 'PATCH', body: { fullName, email } });
  },

  setUserPassword(id: string, newPassword: string): Promise<void> {
    return apiRequest<void>(`/users/${id}/password`, { method: 'POST', body: { newPassword } });
  },

  deleteUser(id: string): Promise<void> {
    return apiRequest<void>(`/users/${id}`, { method: 'DELETE' });
  },

  sendUserInfoStream(userIds: string[], onLine: (obj: MailStreamEvent) => void): Promise<void> {
    return apiStream('/users/send-info', { userIds }, (o) => onLine(o as MailStreamEvent));
  },

  sendUserResetStream(userIds: string[], onLine: (obj: MailStreamEvent) => void): Promise<void> {
    return apiStream('/users/send-reset', { userIds }, (o) => onLine(o as MailStreamEvent));
  },

  resetPassword(token: string, newPassword: string): Promise<void> {
    return apiRequest<void>('/auth/reset', { method: 'POST', body: { token, newPassword } });
  },

  listEmailTemplates(): Promise<EmailTemplate[]> {
    return apiRequest<EmailTemplate[]>('/email-templates');
  },

  updateEmailTemplate(key: string, subject: string, bodyHtml: string): Promise<EmailTemplate> {
    return apiRequest<EmailTemplate>(`/email-templates/${key}`, {
      method: 'PATCH',
      body: { subject, bodyHtml },
    });
  },

  searchActivity(filters: ActivityFilters): Promise<ActivitySearchResponse> {
    return apiRequest<ActivitySearchResponse>('/activity', {
      query: {
        q: filters.q,
        action: filters.action,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        page: filters.page,
        pageSize: filters.pageSize,
      },
    });
  },

  listActivityActions(): Promise<string[]> {
    return apiRequest<string[]>('/activity/actions');
  },

  getReportSummary(): Promise<ReportSummary> {
    return apiRequest<ReportSummary>('/reports/summary');
  },

  exportActivityCsv(filters: Omit<ActivityFilters, 'page' | 'pageSize'>): Promise<string> {
    return apiGetText('/activity/export', {
      q: filters.q,
      action: filters.action,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });
  },
};

export interface ActivityFilters {
  q: string;
  action: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  page: number;
  pageSize: number;
}

/** Toplu e-posta gönderim sonucu. */
export interface BulkMailResult {
  sent: number;
  failed: number;
  skipped: number;
}

/** Canlı gönderim akışında gelen olaylar (NDJSON). */
export type MailStreamEvent =
  | {
      type: 'progress';
      index: number;
      total: number;
      email: string;
      name: string;
      status: 'sending' | 'sent' | 'failed';
      error?: string;
    }
  | { type: 'done'; sent: number; failed: number; skipped: number }
  | { type: 'error'; message: string };
