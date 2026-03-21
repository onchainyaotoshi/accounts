import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { SessionsService } from '../sessions/sessions.service';
import { InvitesService } from '../invites/invites.service';
import { AuditService } from '../audit/audit.service';
import { verifyPassword, generateToken, hashToken } from '../common/utils/crypto';
import { isWeakPassword } from '../common/utils/password-check';
import { PrismaService } from '../common/prisma.service';

const LOCKOUT_MAX_ATTEMPTS = 10;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private sessionsService: SessionsService,
    private invitesService: InvitesService,
    private auditService: AuditService,
    private prisma: PrismaService,
  ) {}

  async login(params: {
    email: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const user = await this.usersService.findByEmail(params.email);

    if (!user) {
      await this.auditService.log({
        eventType: 'LOGIN_FAILED',
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: { email: params.email.substring(0, 255), reason: 'user_not_found' },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      await this.auditService.log({
        eventType: 'LOGIN_FAILED',
        userId: user.id,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: { reason: 'account_not_active' },
      });
      throw new UnauthorizedException('Account is not active');
    }

    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      await this.auditService.log({
        eventType: 'LOGIN_FAILED',
        userId: user.id,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: { reason: 'account_locked' },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await verifyPassword(user.passwordHash, params.password);
    if (!valid) {
      const attempts = user.failedLoginAttempts + 1;
      const shouldLock = attempts >= LOCKOUT_MAX_ATTEMPTS;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lastFailedLoginAt: now,
          ...(shouldLock && { lockedUntil: new Date(now.getTime() + LOCKOUT_DURATION_MS) }),
        },
      });

      await this.auditService.log({
        eventType: 'LOGIN_FAILED',
        userId: user.id,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: { reason: 'invalid_password', failedAttempts: attempts, locked: shouldLock },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    // Reset lockout state on successful login
    if (user.failedLoginAttempts > 0) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastFailedLoginAt: null,
        },
      });
    }

    const { session, token } = await this.sessionsService.create({
      userId: user.id,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    await this.auditService.log({
      eventType: 'LOGIN_SUCCESS',
      userId: user.id,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return {
      user: { id: user.id, email: user.email, status: user.status },
      sessionToken: token,
    };
  }

  async logout(token: string, ipAddress?: string, userAgent?: string) {
    const tokenHash = hashToken(token);
    const session = await this.prisma.session.findUnique({
      where: { sessionTokenHash: tokenHash },
    });

    if (session) {
      await this.sessionsService.revokeByToken(token);
      await this.auditService.log({
        eventType: 'LOGOUT',
        userId: session.userId,
        ipAddress,
        userAgent,
      });
    }
  }

  async signupWithInvite(params: {
    email: string;
    password: string;
    inviteCode: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const existing = await this.usersService.findByEmail(params.email);
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    if (isWeakPassword(params.password)) {
      throw new BadRequestException('Password is too common. Please choose a stronger password.');
    }

    const { user, invite } = await this.prisma.$transaction(async (tx) => {
      const invite = await tx.inviteCode.findUnique({
        where: { code: params.inviteCode.toUpperCase().trim() },
      });

      if (!invite) throw new BadRequestException('Invalid invite code');
      if (invite.revokedAt) throw new BadRequestException('Invite code has been revoked');
      if (invite.expiresAt && invite.expiresAt < new Date()) throw new BadRequestException('Invite code has expired');
      if (invite.usedCount >= invite.maxUses) throw new BadRequestException('Invite code has reached maximum uses');
      if (invite.assignedEmail && params.email && invite.assignedEmail !== params.email.toLowerCase().trim()) {
        throw new BadRequestException('Invite code is not assigned to this email');
      }

      const user = await this.usersService.createInTransaction(tx, params.email, params.password);

      await tx.inviteCode.update({
        where: { id: invite.id },
        data: { usedCount: { increment: 1 } },
      });

      await tx.inviteCodeUsage.create({
        data: {
          inviteCodeId: invite.id,
          usedByUserId: user.id,
          usedEmail: params.email.toLowerCase().trim(),
        },
      });

      return { user, invite };
    });

    await this.auditService.log({
      eventType: 'SIGNUP',
      userId: user.id,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: { inviteCodeId: invite.id },
    });

    await this.auditService.log({
      eventType: 'INVITE_USED',
      userId: user.id,
      ipAddress: params.ipAddress,
      metadata: { inviteCodeId: invite.id },
    });

    const { token } = await this.sessionsService.create({
      userId: user.id,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return {
      user: { id: user.id, email: user.email, status: user.status },
      sessionToken: token,
    };
  }

  async forgotPassword(email: string, ipAddress?: string) {
    const user = await this.usersService.findByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) return { message: 'If the email exists, a reset link has been sent' };

    const token = generateToken();
    const tokenHash = hashToken(token);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    await this.auditService.log({
      eventType: 'PASSWORD_RESET_REQUEST',
      userId: user.id,
      ipAddress,
    });

    if (process.env.NODE_ENV === 'development') {
      // TODO: Send email with reset link containing `token`
      console.log(`[DEV] Password reset token for ${email}: ${token}`);
    }

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(params: {
    token: string;
    newPassword: string;
    ipAddress?: string;
  }) {
    const tokenHash = hashToken(params.token);

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !resetToken ||
      resetToken.consumedAt ||
      resetToken.expiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (isWeakPassword(params.newPassword)) {
      throw new BadRequestException('Password is too common. Please choose a stronger password.');
    }

    const { hashPassword } = await import('../common/utils/crypto');
    const passwordHash = await hashPassword(params.newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastFailedLoginAt: null,
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { consumedAt: new Date() },
      }),
      // Invalidate all other outstanding reset tokens for this user
      this.prisma.passwordResetToken.updateMany({
        where: {
          userId: resetToken.userId,
          id: { not: resetToken.id },
          consumedAt: null,
        },
        data: { consumedAt: new Date() },
      }),
      // Revoke all sessions atomically
      this.prisma.session.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.auditService.log({
      eventType: 'PASSWORD_RESET_COMPLETE',
      userId: resetToken.userId,
      ipAddress: params.ipAddress,
    });

    return { message: 'Password has been reset successfully' };
  }
}
