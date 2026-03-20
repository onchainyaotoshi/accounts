import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { InvitesModule } from '../invites/invites.module';
import { ClientsModule } from '../clients/clients.module';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [UsersModule, InvitesModule, ClientsModule, SessionsModule],
  controllers: [AdminController],
})
export class AdminModule {}
