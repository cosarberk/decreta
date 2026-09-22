const BASE_URL = `${import.meta.env.VITE_API_URL ?? ''}/api`;
const TOKEN_KEY = 'decreta.token';

/** Sunucudan dönen yapılandırılmış hata. */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* localStorage erişilemiyorsa sessizce geç */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* yoksay */
    }
  },
};

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | string[] | undefined | null>;
}

/**
 * Merkezî fetch sarmalayıcı: JWT başlığını ekler, query'yi kurar, hataları
 * {@link ApiError}'a çevirir ve 401'de oturumu temizler.
 */
/**
 * Auth başlığıyla GET yapıp yanıtı düz metin (örn. CSV) olarak döndürür.
 * Export/indirme akışları için.
 */
export async function apiGetText(
  path: string,
  query?: Record<string, string | number | undefined | null>,
): Promise<string> {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }
  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    if (response.status === 401) tokenStore.clear();
    throw new ApiError(response.status, 'ERROR', 'Dışa aktarma başarısız');
  }
  return response.text();
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, Array.isArray(value) ? value.join(',') : String(value));
    }
  }

  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(url.toString(), {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) return undefined as T;

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | T
    | null;

  if (!response.ok) {
    const err = (payload ?? {}) as { error?: string; message?: string };
    if (response.status === 401) tokenStore.clear();
    throw new ApiError(
      response.status,
      err.error ?? 'ERROR',
      err.message ?? 'İstek başarısız oldu',
    );
  }

  return payload as T;
}
