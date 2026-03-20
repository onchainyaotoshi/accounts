const BASE_URL =
  typeof window !== 'undefined'
    ? '/api/proxy'
    : process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7767';

export interface ApiError {
  message: string;
  statusCode: number;
}

export class ApiRequestError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.message || body.error || message;
    } catch {}
    throw new ApiRequestError(message, res.status);
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }

  return res.json();
}

// Auth
export const auth = {
  login: (email: string, password: string) =>
    api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () =>
    api('/auth/logout', { method: 'POST' }),
  signup: (email: string, password: string, inviteCode: string) =>
    api('/auth/signup-with-invite', {
      method: 'POST',
      body: JSON.stringify({ email, password, inviteCode }),
    }),
  forgotPassword: (email: string) =>
    api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, newPassword: string) =>
    api('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),
};

// User
export interface User {
  sub: string;
  email: string;
  email_verified: boolean;
}

export const user = {
  me: () => api<User>('/me'),
};

// Sessions
export interface Session {
  id: string;
  ipAddress: string;
  userAgent: string;
  lastSeenAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export const sessions = {
  list: () => api<{ sessions: Session[] }>('/sessions'),
  revoke: (id: string) => api(`/sessions/${id}`, { method: 'DELETE' }),
  revokeOthers: () => api('/sessions/others/all', { method: 'DELETE' }),
};

// Admin
export interface InviteCode {
  id: string;
  code: string;
  assignedEmail?: string;
  maxUses: number;
  useCount: number;
  expiresAt?: string;
  revokedAt?: string;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  slug: string;
  type: string;
  clientId: string;
  clientSecret?: string;
  redirectUris: string[];
  postLogoutRedirectUris: string[];
  scopes: string[];
  status: string;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  emailVerified: boolean;
  role: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuditLog {
  id: string;
  eventType: string;
  userId?: string;
  clientId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  user?: { email: string };
  client?: { name: string; slug: string };
}

export const admin = {
  users: () => api<{ users: AdminUser[]; total: number }>('/admin/users'),
  invites: () => api<{ invites: InviteCode[]; total: number }>('/admin/invites'),
  createInvite: (data: { assignedEmail?: string; maxUses?: number; expiresAt?: string }) =>
    api<InviteCode>('/admin/invites', { method: 'POST', body: JSON.stringify(data) }),
  revokeInvite: (id: string) =>
    api(`/admin/invites/${id}/revoke`, { method: 'POST' }),
  clients: () => api<{ clients: Client[]; total: number }>('/admin/clients'),
  createClient: (data: { name: string; slug: string; type?: string; redirectUris: string[]; postLogoutRedirectUris?: string[]; scopes?: string[] }) =>
    api<{ client: Client; clientSecret?: string }>('/admin/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id: string, data: Partial<{ name: string; redirectUris: string[]; status: string }>) =>
    api<Client>(`/admin/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  auditLogs: () => api<{ logs: AuditLog[]; total: number }>('/admin/audit-logs'),
};
