import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../common/prisma.service';
import { ClientsService } from '../clients/clients.service';
import { AuditService } from '../audit/audit.service';
import { SessionsService } from '../sessions/sessions.service';
import { generateToken, hashToken } from '../common/utils/crypto';

@Injectable()
export class OAuthService {
  constructor(
    private prisma: PrismaService,
    private clientsService: ClientsService,
    private sessionsService: SessionsService,
    private auditService: AuditService,
  ) {}

  async createAuthCode(params: {
    userId: string;
    clientId: string;
    redirectUri: string;
    scope: string;
    codeChallenge: string;
    codeChallengeMethod?: string;
  }) {
    if (params.codeChallengeMethod && params.codeChallengeMethod !== 'S256') {
      throw new BadRequestException('Only code_challenge_method=S256 is supported');
    }
    const client = await this.clientsService.validateRedirectUri(
      params.clientId,
      params.redirectUri,
    );

    // Validate and filter requested scopes against client's registered scopes
    const requestedScopes = (params.scope || 'openid email').split(' ');
    const allowedScopes = requestedScopes.filter(s => client.scopes.includes(s));
    if (allowedScopes.length === 0) {
      throw new BadRequestException('No valid scopes requested');
    }
    const scope = allowedScopes.join(' ');

    const code = generateToken(32);
    const codeHash = hashToken(code);

    await this.prisma.authCode.create({
      data: {
        codeHash,
        userId: params.userId,
        clientId: client.id,
        redirectUri: params.redirectUri,
        scope,
        codeChallenge: params.codeChallenge,
        codeChallengeMethod: 'S256',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    await this.auditService.log({
      eventType: 'AUTH_CODE_ISSUED',
      userId: params.userId,
      clientId: client.id,
    });

    return code;
  }

  async exchangeCode(params: {
    code: string;
    clientId: string;
    clientSecret?: string;
    redirectUri: string;
    codeVerifier: string;
  }) {
    const codeHash = hashToken(params.code);

    const authCode = await this.prisma.authCode.findUnique({
      where: { codeHash },
      include: { user: true, client: true },
    });

    if (!authCode || authCode.consumedAt || authCode.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired authorization code');
    }

    if (authCode.client.clientId !== params.clientId) {
      throw new BadRequestException('Client mismatch');
    }

    if (authCode.redirectUri !== params.redirectUri) {
      throw new BadRequestException('Redirect URI mismatch');
    }

    // Verify client secret for confidential clients
    if (authCode.client.type === 'CONFIDENTIAL') {
      if (!params.clientSecret) {
        throw new BadRequestException('Client secret required for confidential clients');
      }
      const secretHash = hashToken(params.clientSecret);
      if (secretHash !== authCode.client.clientSecretHash) {
        throw new BadRequestException('Invalid client secret');
      }
    }

    // Atomic consume — must happen before PKCE check per RFC 6749 Section 4.1.2
    const consumed = await this.prisma.authCode.updateMany({
      where: { id: authCode.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    if (consumed.count === 0) {
      throw new BadRequestException('Authorization code already used');
    }

    // Verify PKCE (auth code is already consumed to prevent replay on failure)
    const expectedChallenge = createHash('sha256')
      .update(params.codeVerifier)
      .digest('base64url');

    if (expectedChallenge !== authCode.codeChallenge) {
      throw new BadRequestException('Invalid code verifier');
    }

    // Create session token for the client (atomic with audit log)
    const sessionToken = generateToken();
    const sessionTokenHash = hashToken(sessionToken);

    await this.prisma.$transaction(async (tx) => {
      await tx.session.create({
        data: {
          userId: authCode.userId,
          clientId: authCode.client.id,
          sessionTokenHash,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    });

    await this.auditService.log({
      eventType: 'TOKEN_ISSUED',
      userId: authCode.userId,
      clientId: authCode.client.id,
    });

    return {
      access_token: sessionToken,
      token_type: 'Bearer',
      expires_in: 30 * 24 * 60 * 60,
      scope: authCode.scope,
    };
  }

  async handleLogout(params: {
    token?: string;
    cookieToken?: string;
    clientId?: string;
    postLogoutRedirectUri?: string;
  }): Promise<string> {
    // Revoke the token-based session if provided
    if (params.token) {
      await this.sessionsService.revokeByToken(params.token);
    }

    // Revoke the cookie-based session if present
    if (params.cookieToken && params.cookieToken !== params.token) {
      await this.sessionsService.revokeByToken(params.cookieToken);
    }

    // Determine redirect destination
    if (params.clientId && params.postLogoutRedirectUri) {
      const isValid =
        await this.clientsService.validatePostLogoutRedirectUri(
          params.clientId,
          params.postLogoutRedirectUri,
        );
      if (isValid) {
        return params.postLogoutRedirectUri;
      }
    }

    // Default: redirect to login page
    return '/login';
  }

  async getUserInfo(token: string) {
    const tokenHash = hashToken(token);
    const session = await this.prisma.session.findUnique({
      where: { sessionTokenHash: tokenHash },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (session.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is not active');
    }

    return {
      sub: session.user.id,
      email: session.user.email,
      email_verified: !!session.user.emailVerifiedAt,
    };
  }
}
