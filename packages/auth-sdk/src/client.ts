import { generateCodeVerifier, generateCodeChallenge, generateState } from './pkce';
import { AuthStorage } from './storage';
import type { YaotoshiAuthConfig, TokenResponse, UserInfo, AuthResult } from './types';

export class YaotoshiAuth {
  private config: Required<Pick<YaotoshiAuthConfig, 'clientId' | 'redirectUri' | 'accountsUrl'>> &
    YaotoshiAuthConfig;
  private storage: AuthStorage;

  constructor(config: YaotoshiAuthConfig) {
    this.config = {
      scopes: ['openid', 'email'],
      postLogoutRedirectUri: undefined,
      storagePrefix: 'yaotoshi_auth',
      ...config,
    };
    this.storage = new AuthStorage(this.config.storagePrefix);
  }

  async login(): Promise<void> {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();

    this.storage.set('code_verifier', codeVerifier);
    this.storage.set('state', state);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: (this.config.scopes ?? ['openid', 'email']).join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    window.location.href = `${this.config.accountsUrl}/authorize?${params.toString()}`;
  }

  async handleCallback(): Promise<AuthResult> {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    if (error) {
      throw new Error(`Authorization error: ${error}`);
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

    // Exchange code for token
    const tokenResponse = await fetch(`${this.config.accountsUrl}/api/proxy/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      throw new Error(err.message || 'Token exchange failed');
    }

    const tokenData: TokenResponse = await tokenResponse.json();

    // Clean up PKCE state
    this.storage.remove('code_verifier');
    this.storage.remove('state');

    // Persist the access token
    this.storage.setPersistent('access_token', tokenData.access_token);

    // Fetch user info
    const user = await this.getUser(tokenData.access_token);

    return { accessToken: tokenData.access_token, user };
  }

  async getUser(token?: string): Promise<UserInfo> {
    const accessToken = token || this.getAccessToken();
    if (!accessToken) {
      throw new Error('No access token available');
    }

    const response = await fetch(`${this.config.accountsUrl}/api/proxy/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.storage.removePersistent('access_token');
      }
      throw new Error('Failed to fetch user info');
    }

    return response.json();
  }

  logout(): void {
    const token = this.getAccessToken();
    this.storage.clearAll();

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `${this.config.accountsUrl}/api/proxy/logout`;

    const addField = (name: string, value: string) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    };

    if (token) addField('token', token);
    if (this.config.clientId) addField('client_id', this.config.clientId);
    if (this.config.postLogoutRedirectUri) addField('post_logout_redirect_uri', this.config.postLogoutRedirectUri);

    document.body.appendChild(form);
    form.submit();
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  getAccessToken(): string | null {
    return this.storage.getPersistent('access_token');
  }
}
