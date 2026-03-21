import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from './prisma.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredRecords() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [authCodes, resetTokens, sessions] = await Promise.all([
      // Delete consumed or expired auth codes older than 1 day
      this.prisma.authCode.deleteMany({
        where: {
          OR: [
            { consumedAt: { not: null } },
            { expiresAt: { lt: now } },
          ],
          createdAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      }),
      // Delete consumed or expired password reset tokens older than 1 day
      this.prisma.passwordResetToken.deleteMany({
        where: {
          OR: [
            { consumedAt: { not: null } },
            { expiresAt: { lt: now } },
          ],
          createdAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      }),
      // Delete revoked or expired sessions older than 30 days
      this.prisma.session.deleteMany({
        where: {
          OR: [
            { revokedAt: { not: null } },
            { expiresAt: { lt: now } },
          ],
          createdAt: { lt: thirtyDaysAgo },
        },
      }),
    ]);

    this.logger.log(
      `Cleanup: ${authCodes.count} auth codes, ${resetTokens.count} reset tokens, ${sessions.count} sessions deleted`,
    );
  }
}
