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

  async validate(code: string, email?: string) {
    const invite = await this.prisma.inviteCode.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!invite) {
      throw new BadRequestException('Invalid invite code');
    }
    if (invite.revokedAt) {
      throw new BadRequestException('Invite code has been revoked');
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new BadRequestException('Invite code has expired');
    }
    if (invite.usedCount >= invite.maxUses) {
      throw new BadRequestException('Invite code has reached maximum uses');
    }
    if (invite.assignedEmail && email && invite.assignedEmail !== email.toLowerCase().trim()) {
      throw new BadRequestException('Invite code is not assigned to this email');
    }

    return invite;
  }

  async consume(inviteCodeId: string, userId: string, email: string) {
    await this.prisma.$transaction([
      this.prisma.inviteCode.update({
        where: { id: inviteCodeId },
        data: { usedCount: { increment: 1 } },
      }),
      this.prisma.inviteCodeUsage.create({
        data: {
          inviteCodeId,
          usedByUserId: userId,
          usedEmail: email.toLowerCase().trim(),
        },
      }),
    ]);
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
