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
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const results = await Promise.allSettled([
      // Delete consumed or expired auth codes older than 1 day
      this.prisma.authCode.deleteMany({
        where: {
          OR: [
            { consumedAt: { not: null } },
            { expiresAt: { lt: now } },
          ],
          createdAt: { lt: oneDayAgo },
        },
      }),
      // Delete consumed or expired password reset tokens older than 1 day
      this.prisma.passwordResetToken.deleteMany({
        where: {
          OR: [
            { consumedAt: { not: null } },
            { expiresAt: { lt: now } },
          ],
          createdAt: { lt: oneDayAgo },
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
      // Delete audit logs older than 1 year
      this.prisma.auditLog.deleteMany({
        where: {
          createdAt: { lt: oneYearAgo },
        },
      }),
    ]);

    const labels = ['auth codes', 'reset tokens', 'sessions', 'audit logs'];
    const summary = results.map((r, i) => {
      if (r.status === 'fulfilled') return `${r.value.count} ${labels[i]}`;
      this.logger.error(`Cleanup failed for ${labels[i]}: ${r.reason}`);
      return `${labels[i]} failed`;
    });

    this.logger.log(`Cleanup: ${summary.join(', ')} deleted`);
  }
}
