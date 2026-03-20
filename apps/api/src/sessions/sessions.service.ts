import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { generateToken, hashToken } from '../common/utils/crypto';

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  async create(params: {
    userId: string;
    clientId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ session: any; token: string }> {
    const token = generateToken();
    const tokenHash = hashToken(token);

    const session = await this.prisma.session.create({
      data: {
        userId: params.userId,
        clientId: params.clientId,
        sessionTokenHash: tokenHash,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
      },
    });

    return { session, token };
  }

  async listForUser(userId: string) {
    return this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastSeenAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        lastSeenAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  async revoke(sessionId: string, userId: string): Promise<boolean> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId, revokedAt: null },
    });
    if (!session) return false;

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
    return true;
  }

  async revokeAllOthers(userId: string, currentSessionId: string) {
    return this.prisma.session.updateMany({
      where: {
        userId,
        id: { not: currentSessionId },
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  async revokeByToken(token: string): Promise<boolean> {
    const tokenHash = hashToken(token);
    const session = await this.prisma.session.findUnique({
      where: { sessionTokenHash: tokenHash },
    });
    if (!session || session.revokedAt) return false;

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    return true;
  }

  async revokeAllForUser(userId: string) {
    return this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
