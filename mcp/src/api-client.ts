/**
 * HTTP client wrapper for the accounts API.
 * Handles authentication, token management, and request execution.
 */

const DEFAULT_API_URL = "http://localhost:7767";
const DEFAULT_ADMIN_EMAIL = "admin@yaotoshi.xyz";
const DEFAULT_ADMIN_PASSWORD = "admin12345678";

export class AccountsApiClient {
  private apiUrl: string;
  private adminEmail: string;
  private adminPassword: string;
  private sessionToken: string | null = null;

  constructor() {
    this.apiUrl = process.env.ACCOUNTS_API_URL || DEFAULT_API_URL;
    this.adminEmail = process.env.ACCOUNTS_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
    this.adminPassword =
      process.env.ACCOUNTS_ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
  }

  /**
   * Authenticate with the API and store the session token.
   */
  async login(): Promise<void> {
    const res = await fetch(`${this.apiUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: this.adminEmail,
        password: this.adminPassword,
      }),
      redirect: "manual",
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Login failed (${res.status}): ${body}`);
    }

    // Extract session_token from Set-Cookie header
    const setCookie = res.headers.getSetCookie?.() ?? [];
    for (const cookie of setCookie) {
      const match = cookie.match(/session_token=([^;]+)/);
      if (match) {
        this.sessionToken = match[1];
        return;
      }
    }

    // Fallback: try raw set-cookie header
    const rawCookie = res.headers.get("set-cookie") || "";
    const match = rawCookie.match(/session_token=([^;]+)/);
    if (match) {
      this.sessionToken = match[1];
      return;
    }

    throw new Error("Login succeeded but no session_token cookie was returned");
  }

  /**
   * Ensure we have a valid session, re-authenticating if needed.
   */
  private async ensureAuth(): Promise<void> {
    if (!this.sessionToken) {
      await this.login();
    }
  }

  /**
   * Make an authenticated API request. Retries once on 401 (re-login).
   */
  async request<T = unknown>(
    method: string,
    path: string,
    options?: {
      body?: Record<string, unknown>;
      params?: Record<string, string | number | undefined>;
    }
  ): Promise<T> {
    await this.ensureAuth();

    const doRequest = async (): Promise<Response> => {
      let url = `${this.apiUrl}${path}`;

      if (options?.params) {
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(options.params)) {
          if (value !== undefined && value !== null) {
            searchParams.set(key, String(value));
          }
        }
        const qs = searchParams.toString();
        if (qs) url += `?${qs}`;
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.sessionToken}`,
        "Content-Type": "application/json",
      };

      const fetchOptions: RequestInit = { method, headers };
      if (options?.body) {
        fetchOptions.body = JSON.stringify(options.body);
      }

      return fetch(url, fetchOptions);
    };

    let res = await doRequest();

    // Re-authenticate on 401 and retry once
    if (res.status === 401) {
      this.sessionToken = null;
      await this.login();
      res = await doRequest();
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API error ${res.status} ${method} ${path}: ${body}`);
    }

    // Handle 204 No Content
    if (res.status === 204) {
      return {} as T;
    }

    return res.json() as Promise<T>;
  }

  async get<T = unknown>(
    path: string,
    params?: Record<string, string | number | undefined>
  ): Promise<T> {
    return this.request<T>("GET", path, { params });
  }

  async post<T = unknown>(
    path: string,
    body?: Record<string, unknown>,
    params?: Record<string, string | number | undefined>
  ): Promise<T> {
    return this.request<T>("POST", path, { body, params });
  }

  async patch<T = unknown>(
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    return this.request<T>("PATCH", path, { body });
  }
}
