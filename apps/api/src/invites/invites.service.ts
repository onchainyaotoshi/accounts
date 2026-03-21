import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { generateCode } from '../common/utils/crypto';

@Injectable()
export class InvitesService {
  constructor(private prisma: PrismaService) {}

  async create(params: {
    createdByUserId?: string;
    assignedEmail?: string;
    maxUses?: number;
    expiresAt?: Date;
  }) {
    const code = generateCode(8);
    return this.prisma.inviteCode.create({
      data: {
        code,
        createdByUserId: params.createdByUserId,
        assignedEmail: params.assignedEmail?.toLowerCase().trim(),
        maxUses: params.maxUses ?? 1,
        expiresAt: params.expiresAt,
      },
    });
  }

  async revoke(id: string) {
    return this.prisma.inviteCode.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async list(skip = 0, take = 50) {
    const [invites, total] = await Promise.all([
      this.prisma.inviteCode.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { email: true } },
          usages: {
            select: { usedEmail: true, createdAt: true },
          },
        },
      }),
      this.prisma.inviteCode.count(),
    ]);
    return { invites, total };
  }
}
