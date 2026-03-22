import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { OAuthService } from './oauth.service';
import { SessionGuard } from '../common/guards/session.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { AuthorizeQueryDto, TokenRequestDto, LogoutRequestDto } from './oauth.dto';

@Controller()
export class OAuthController {
  constructor(private oauthService: OAuthService) {}

  @Get('authorize')
  @UseGuards(SessionGuard)
  @Throttle({ short: { limit: 20, ttl: 60000 } })
  async authorize(
    @Query() query: AuthorizeQueryDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    if (query.response_type !== 'code') {
      throw new BadRequestException('Only response_type=code is supported');
    }
    if (!query.client_id || !query.redirect_uri || !query.code_challenge) {
      throw new BadRequestException('Missing required parameters');
    }

    if (query.code_challenge_method && query.code_challenge_method !== 'S256') {
      throw new BadRequestException('Only code_challenge_method=S256 is supported');
    }

    const code = await this.oauthService.createAuthCode({
      userId: user.id,
      clientId: query.client_id,
      redirectUri: query.redirect_uri,
      scope: query.scope || 'openid email',
      codeChallenge: query.code_challenge,
      codeChallengeMethod: query.code_challenge_method || 'S256',
    });

    const url = new URL(query.redirect_uri);
    url.searchParams.set('code', code);
    if (query.state) url.searchParams.set('state', query.state);

    return res.redirect(url.toString());
  }

  @Post('token')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async token(@Body() body: TokenRequestDto) {
    if (body.grant_type !== 'authorization_code') {
      throw new BadRequestException(
        'Only grant_type=authorization_code is supported',
      );
    }
    if (!body.code || !body.client_id || !body.redirect_uri || !body.code_verifier) {
      throw new BadRequestException('Missing required parameters');
    }

    return this.oauthService.exchangeCode({
      code: body.code,
      clientId: body.client_id,
      clientSecret: body.client_secret,
      redirectUri: body.redirect_uri,
      codeVerifier: body.code_verifier,
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  async logout(
    @Body() body: LogoutRequestDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const cookieToken = req.cookies?.session_token;

    const redirectTo = await this.oauthService.handleLogout({
      token: body.token,
      cookieToken,
      clientId: body.client_id,
      postLogoutRedirectUri: body.post_logout_redirect_uri,
    });

    // Clear the session cookie
    res.clearCookie('session_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return res.redirect(redirectTo);
  }

  @Get('me')
  @UseGuards(SessionGuard)
  async me(@CurrentUser() user: User) {
    return {
      sub: user.id,
      email: user.email,
      email_verified: !!user.emailVerifiedAt,
      role: user.role,
    };
  }
}
