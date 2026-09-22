import { apiRequest } from './api';
import type {
  Affect,
  CreateRecordPayload,
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

  createLabel(name: string, color?: string): Promise<LabelWithUsage> {
    return apiRequest<LabelWithUsage>('/labels', { method: 'POST', body: { name, color } });
  },

  listModules(): Promise<ModuleWithUsage[]> {
    return apiRequest<ModuleWithUsage[]>('/modules');
  },

  createModule(name: string): Promise<ModuleWithUsage> {
    return apiRequest<ModuleWithUsage>('/modules', { method: 'POST', body: { name } });
  },

  listLinkTypes(): Promise<LinkType[]> {
    return apiRequest<LinkType[]>('/link-types');
  },

  createLinkType(input: {
    forwardName: string;
    inverseName: string;
    color?: string;
    isSupersede: boolean;
  }): Promise<LinkType> {
    return apiRequest<LinkType>('/link-types', { method: 'POST', body: input });
  },

  deleteLinkType(id: string): Promise<void> {
    return apiRequest<void>(`/link-types/${id}`, { method: 'DELETE' });
  },

  async searchPersons(query: string): Promise<string[]> {
    const rows = await apiRequest<PersonRow[]>('/persons', { query: { q: query, limit: 20 } });
    return rows.map((row) => row.full_name);
  },

  async searchPersonsFull(query: string): Promise<{ id: string; fullName: string }[]> {
    const rows = await apiRequest<PersonRow[]>('/persons', { query: { q: query, limit: 10 } });
    return rows.map((row) => ({ id: row.id, fullName: row.full_name }));
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
};
