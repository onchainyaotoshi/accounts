import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export type AuditEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'SIGNUP'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET_COMPLETE'
  | 'SESSION_REVOKED'
  | 'ALL_SESSIONS_REVOKED'
  | 'INVITE_CREATED'
  | 'INVITE_USED'
  | 'INVITE_REVOKED'
  | 'CLIENT_CREATED'
  | 'CLIENT_UPDATED'
  | 'AUTH_CODE_ISSUED'
  | 'TOKEN_ISSUED';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    eventType: AuditEventType;
    userId?: string;
    clientId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }) {
    return this.prisma.auditLog.create({
      data: {
        eventType: params.eventType,
        userId: params.userId,
        clientId: params.clientId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: params.metadata || {},
      },
    });
  }

  async listByUser(userId: string, skip = 0, take = 50) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async listAll(skip = 0, take = 50) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: { user: { select: { email: true } } },
    });
  }
}
