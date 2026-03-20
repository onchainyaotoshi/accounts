import { Module } from '@nestjs/common';
import { OAuthService } from './oauth.service';
import { OAuthController } from './oauth.controller';
import { WellKnownController } from './well-known.controller';
import { ClientsModule } from '../clients/clients.module';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [ClientsModule, SessionsModule],
  providers: [OAuthService],
  controllers: [OAuthController, WellKnownController],
})
export class OAuthModule {}
