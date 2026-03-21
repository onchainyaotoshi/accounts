import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma.service';
import { hashToken } from '../utils/crypto';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token =
      request.cookies?.session_token ||
      (() => {
        const match = request.headers.authorization?.match(/^Bearer\s+(.+)$/);
        return match?.[1];
      })();

    if (!token) {
      throw new UnauthorizedException('No session token provided');
    }

    const tokenHash = hashToken(token);
    const session = await this.prisma.session.findUnique({
      where: { sessionTokenHash: tokenHash },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    if (session.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is not active');
    }

    // Update last seen
    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });

    (request as any).user = session.user;
    (request as any).session_id = session.id;

    return true;
  }
}
