import { generateCodeVerifier, generateCodeChallenge, generateState } from './pkce';
import { AuthStorage } from './storage';
import type { YaotoshiAuthConfig, TokenResponse, UserInfo, AuthResult } from './types';

export class YaotoshiAuth {
  private config: Required<Pick<YaotoshiAuthConfig, 'clientId' | 'redirectUri' | 'accountsUrl'>> &
    YaotoshiAuthConfig;
  private storage: AuthStorage;
  private processing = false;

  constructor(config: YaotoshiAuthConfig) {
    this.config = {
      scopes: ['openid', 'email'],
      postLogoutRedirectUri: undefined,
      storagePrefix: 'yaotoshi_auth',
      apiPathPrefix: '/api/proxy',
      ...config,
    };
    this.storage = new AuthStorage(this.config.storagePrefix);
  }

  private apiUrl(path: string): string {
    if (this.config.proxyBaseUrl !== undefined) {
      return `${this.config.proxyBaseUrl}${path}`;
    }
    const prefix = this.config.apiPathPrefix ?? '/api/proxy';
    return `${this.config.accountsUrl}${prefix}${path}`;
  }

  async login(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('login() requires a browser environment');
    }

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();

    this.storage.set('code_verifier', codeVerifier);
    this.storage.set('state', state);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes!.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    window.location.href = `${this.config.accountsUrl}/authorize?${params.toString()}`;
  }

  async handleCallback(): Promise<AuthResult> {
    if (this.processing) {
      throw new Error('Callback is already being processed');
    }
    this.processing = true;

    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');

      if (error) {
        const errorDescription = params.get('error_description');
        throw new Error(`Authorization error: ${error}${errorDescription ? ` — ${errorDescription}` : ''}`);
      }

      if (!code || !state) {
        throw new Error('Missing code or state in callback');
      }

      const savedState = this.storage.get('state');
      if (state !== savedState) {
        throw new Error('State mismatch — possible CSRF attack');
      }

      const codeVerifier = this.storage.get('code_verifier');
      if (!codeVerifier) {
        throw new Error('Missing code verifier — login flow may have been interrupted');
      }

      const tokenResponse = await fetch(this.apiUrl('/token'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          client_id: this.config.clientId,
          redirect_uri: this.config.redirectUri,
          code_verifier: codeVerifier,
        }),
      });

      if (!tokenResponse.ok) {
        const err = await tokenResponse.json().catch(() => ({}));
        const message = Array.isArray(err.message) ? err.message.join(', ') : (err.message || 'Token exchange failed');
        throw new Error(message);
      }

      const tokenData: TokenResponse = await tokenResponse.json();

      // Clean up PKCE state
      this.storage.remove('code_verifier');
      this.storage.remove('state');

      // Persist the access token
      this.storage.setPersistent('access_token', tokenData.access_token);
      this.storage.setPersistent('token_expires_at', String(Date.now() + tokenData.expires_in * 1000));

      // Fetch user info
      const user = await this.getUser(tokenData.access_token);

      return {
        accessToken: tokenData.access_token,
        scope: tokenData.scope,
        expiresIn: tokenData.expires_in,
        user,
      };
    } finally {
      this.processing = false;
    }
  }

  async getUser(token?: string): Promise<UserInfo> {
    const accessToken = token || this.getAccessToken();
    if (!accessToken) {
      throw new Error('No access token available');
    }

    const response = await fetch(this.apiUrl('/me'), {
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.storage.removePersistent('access_token');
        this.storage.removePersistent('token_expires_at');
      }
      throw new Error('Failed to fetch user info');
    }

    const data = await response.json();
    if (!data.sub || !data.email) {
      throw new Error('Invalid user info response');
    }

    return data;
  }

  async logout(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('logout() requires a browser environment');
    }

    const token = this.getAccessToken();

    try {
      await fetch(this.apiUrl('/logout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...(token && { token }),
          ...(this.config.clientId && { client_id: this.config.clientId }),
          ...(this.config.postLogoutRedirectUri && { post_logout_redirect_uri: this.config.postLogoutRedirectUri }),
        }),
      });
    } finally {
      // Clear local state regardless of server response
      this.storage.clearAll();
    }

    // Redirect after successful logout
    if (this.config.postLogoutRedirectUri) {
      window.location.href = this.config.postLogoutRedirectUri;
    }
  }

  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    const expiresAt = this.storage.getPersistent('token_expires_at');
    if (expiresAt && Date.now() > Number(expiresAt)) {
      this.storage.removePersistent('access_token');
      this.storage.removePersistent('token_expires_at');
      return false;
    }

    return true;
  }

  getAccessToken(): string | null {
    return this.storage.getPersistent('access_token');
  }
}
