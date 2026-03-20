import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { User, UserStatus } from '@prisma/client';
import { hashPassword } from '../common/utils/crypto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(email: string, password: string): Promise<User> {
    const passwordHash = await hashPassword(password);
    return this.prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
      },
    });
  }

  async updateStatus(userId: string, status: UserStatus): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
    });
  }

  async list(skip = 0, take = 50) {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          status: true,
          emailVerifiedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count(),
    ]);
    return { users, total };
  }
}
