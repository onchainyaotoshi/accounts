import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SessionGuard } from '../common/guards/session.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { UsersService } from '../users/users.service';
import { InvitesService } from '../invites/invites.service';
import { ClientsService } from '../clients/clients.service';
import { SessionsService } from '../sessions/sessions.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import {
  CreateInviteDto,
  CreateClientDto,
  UpdateClientDto,
} from './admin.dto';

@Controller('admin')
@UseGuards(SessionGuard, AdminGuard)
export class AdminController {
  constructor(
    private usersService: UsersService,
    private invitesService: InvitesService,
    private clientsService: ClientsService,
    private sessionsService: SessionsService,
    private auditService: AuditService,
  ) {}

  // --- Users ---
  @Get('users')
  async listUsers(@Query('skip') skip?: string, @Query('take') take?: string) {
    return this.usersService.list(
      Math.max(skip ? parseInt(skip) || 0 : 0, 0),
      Math.min(take ? parseInt(take) || 50 : 50, 100),
    );
  }

  // --- Invites ---
  @Get('invites')
  async listInvites(@Query('skip') skip?: string, @Query('take') take?: string) {
    return this.invitesService.list(
      Math.max(skip ? parseInt(skip) || 0 : 0, 0),
      Math.min(take ? parseInt(take) || 50 : 50, 100),
    );
  }

  @Post('invites')
  async createInvite(@Body() body: CreateInviteDto, @CurrentUser() user: User) {
    const invite = await this.invitesService.create({
      createdByUserId: user.id,
      assignedEmail: body.assignedEmail,
      maxUses: body.maxUses,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });

    await this.auditService.log({
      eventType: 'INVITE_CREATED',
      userId: user.id,
      metadata: { inviteCode: invite.code, inviteId: invite.id },
    });

    return invite;
  }

  @Post('invites/:id/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeInvite(@Param('id') id: string, @CurrentUser() user: User) {
    const invite = await this.invitesService.revoke(id);

    await this.auditService.log({
      eventType: 'INVITE_REVOKED',
      userId: user.id,
      metadata: { inviteId: id },
    });

    return invite;
  }

  // --- Clients ---
  @Get('clients')
  async listClients() {
    return this.clientsService.list();
  }

  @Post('clients')
  async createClient(@Body() body: CreateClientDto, @CurrentUser() user: User) {
    const result = await this.clientsService.create({
      name: body.name,
      slug: body.slug,
      type: body.type,
      redirectUris: body.redirectUris,
      postLogoutRedirectUris: body.postLogoutRedirectUris,
      scopes: body.scopes,
    });

    await this.auditService.log({
      eventType: 'CLIENT_CREATED',
      userId: user.id,
      metadata: { clientId: result.client.clientId, slug: body.slug },
    });

    return result;
  }

  @Patch('clients/:id')
  async updateClient(
    @Param('id') id: string,
    @Body() body: UpdateClientDto,
    @CurrentUser() user: User,
  ) {
    const client = await this.clientsService.update(id, body);

    await this.auditService.log({
      eventType: 'CLIENT_UPDATED',
      userId: user.id,
      metadata: { clientDbId: id },
    });

    return client;
  }

  // --- Audit ---
  @Get('audit-logs')
  async listAuditLogs(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.auditService.listAll(
      Math.max(skip ? parseInt(skip) || 0 : 0, 0),
      Math.min(take ? parseInt(take) || 50 : 50, 100),
    );
  }

  // --- Sessions (admin) ---
  @Get('users/:userId/sessions')
  async listUserSessions(@Param('userId') userId: string) {
    return this.sessionsService.listForUser(userId);
  }

  @Post('sessions/:id/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeSession(
    @Param('id') sessionId: string,
    @CurrentUser() user: User,
    @Query('userId') userId: string,
  ) {
    await this.sessionsService.revoke(sessionId, userId);
    await this.auditService.log({
      eventType: 'SESSION_REVOKED',
      userId: user.id,
      metadata: { targetSessionId: sessionId, targetUserId: userId },
    });
    return { message: 'Session revoked' };
  }
}
