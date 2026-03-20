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
    codeChallengeMethod: string;
  }) {
    const client = await this.clientsService.validateRedirectUri(
      params.clientId,
      params.redirectUri,
    );

    const code = generateToken(32);
    const codeHash = hashToken(code);

    await this.prisma.authCode.create({
      data: {
        codeHash,
        userId: params.userId,
        clientId: client.id,
        redirectUri: params.redirectUri,
        scope: params.scope || 'openid email',
        codeChallenge: params.codeChallenge,
        codeChallengeMethod: params.codeChallengeMethod || 'S256',
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

    // Verify PKCE
    const expectedChallenge = createHash('sha256')
      .update(params.codeVerifier)
      .digest('base64url');

    if (expectedChallenge !== authCode.codeChallenge) {
      throw new BadRequestException('Invalid code verifier');
    }

    // Mark as consumed
    await this.prisma.authCode.update({
      where: { id: authCode.id },
      data: { consumedAt: new Date() },
    });

    // Create session token for the client
    const sessionToken = generateToken();
    const sessionTokenHash = hashToken(sessionToken);

    const session = await this.prisma.session.create({
      data: {
        userId: authCode.userId,
        clientId: authCode.client.id,
        sessionTokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
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
