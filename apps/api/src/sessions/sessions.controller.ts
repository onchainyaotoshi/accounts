import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionGuard } from '../common/guards/session.guard';
import {
  CurrentUser,
  CurrentSessionId,
} from '../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { User } from '@prisma/client';

@Controller('sessions')
@UseGuards(SessionGuard)
export class SessionsController {
  constructor(
    private sessionsService: SessionsService,
    private auditService: AuditService,
  ) {}

  @Get()
  async list(@CurrentUser() user: User, @CurrentSessionId() currentSessionId: string) {
    const sessions = await this.sessionsService.listForUser(user.id);
    return {
      sessions: sessions.map((s) => ({
        ...s,
        isCurrent: s.id === currentSessionId,
      })),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    await this.sessionsService.revoke(id, user.id);
    await this.auditService.log({
      eventType: 'SESSION_REVOKED',
      userId: user.id,
      metadata: { sessionId: id },
    });
  }

  @Delete('others/all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeOthers(
    @CurrentUser() user: User,
    @CurrentSessionId() currentSessionId: string,
  ) {
    await this.sessionsService.revokeAllOthers(user.id, currentSessionId);
    await this.auditService.log({
      eventType: 'ALL_SESSIONS_REVOKED',
      userId: user.id,
    });
  }
}
