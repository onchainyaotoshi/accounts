/** Configuration for YaotoshiAuth client. */
export interface YaotoshiAuthConfig {
  clientId: string;
  redirectUri: string;
  postLogoutRedirectUri?: string;
  accountsUrl: string;
  scopes?: string[];
  storagePrefix?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface UserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
}

export interface AuthResult {
  accessToken: string;
  user: UserInfo;
}
