/** Configuration options for the YaotoshiAuth client. */
export interface YaotoshiAuthConfig {
  /** OAuth client ID */
  clientId: string;
  /** OAuth redirect URI for callback */
  redirectUri: string;
  /** URI to redirect to after logout */
  postLogoutRedirectUri?: string;
  /** Base URL of the accounts service (e.g., "https://accounts.example.com") */
  accountsUrl: string;
  /** OAuth scopes to request (default: ['openid', 'email']) */
  scopes?: string[];
  /** Prefix for storage keys (default: 'yaotoshi_auth') */
  storagePrefix?: string;
  /**
   * API path prefix. Set to '/api/proxy' when using the Next.js proxy (default),
   * or '' when connecting directly to the API.
   */
  apiPathPrefix?: string;
  /**
   * Base URL for a same-origin backend proxy that forwards requests to the accounts API.
   * When set, API calls (token, /me, logout) are sent to this URL instead of accountsUrl.
   * Login redirects still go to accountsUrl (browser redirects are not affected by CORS).
   *
   * Example: '/auth/proxy' → API calls go to '/auth/proxy/token', '/auth/proxy/me', etc.
   *
   * Use this when your app runs on a different domain than the accounts service
   * and you want to avoid CORS by routing API calls through your own backend.
   */
  proxyBaseUrl?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/** User info returned by the /me endpoint. `sub` is the user's unique ID (cuid). */
export interface UserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
}

export interface AuthResult {
  accessToken: string;
  /** Granted scopes (may differ from requested scopes) */
  scope: string;
  /** Token lifetime in seconds */
  expiresIn: number;
  user: UserInfo;
}
