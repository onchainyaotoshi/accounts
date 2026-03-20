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
import { Request, Response } from 'express';
import { OAuthService } from './oauth.service';
import { SessionGuard } from '../common/guards/session.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller()
export class OAuthController {
  constructor(private oauthService: OAuthService) {}

  @Get('authorize')
  @UseGuards(SessionGuard)
  async authorize(
    @Query('response_type') responseType: string,
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('scope') scope: string,
    @Query('state') state: string,
    @Query('code_challenge') codeChallenge: string,
    @Query('code_challenge_method') codeChallengeMethod: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    if (responseType !== 'code') {
      throw new BadRequestException('Only response_type=code is supported');
    }
    if (!clientId || !redirectUri || !codeChallenge) {
      throw new BadRequestException('Missing required parameters');
    }

    const code = await this.oauthService.createAuthCode({
      userId: user.id,
      clientId,
      redirectUri,
      scope: scope || 'openid email',
      codeChallenge,
      codeChallengeMethod: codeChallengeMethod || 'S256',
    });

    const url = new URL(redirectUri);
    url.searchParams.set('code', code);
    if (state) url.searchParams.set('state', state);

    return res.redirect(url.toString());
  }

  @Post('token')
  @HttpCode(HttpStatus.OK)
  async token(
    @Body('grant_type') grantType: string,
    @Body('code') code: string,
    @Body('client_id') clientId: string,
    @Body('redirect_uri') redirectUri: string,
    @Body('code_verifier') codeVerifier: string,
  ) {
    if (grantType !== 'authorization_code') {
      throw new BadRequestException(
        'Only grant_type=authorization_code is supported',
      );
    }
    if (!code || !clientId || !redirectUri || !codeVerifier) {
      throw new BadRequestException('Missing required parameters');
    }

    return this.oauthService.exchangeCode({
      code,
      clientId,
      redirectUri,
      codeVerifier,
    });
  }

  @Get('logout')
  async logout(
    @Query('post_logout_redirect_uri') postLogoutRedirectUri: string,
    @Query('client_id') clientId: string,
    @Query('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const cookieToken = req.cookies?.session_token;

    const redirectTo = await this.oauthService.handleLogout({
      token,
      cookieToken,
      clientId,
      postLogoutRedirectUri,
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
  async me(@Req() req: Request) {
    const token =
      req.cookies?.session_token ||
      req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new BadRequestException('No token provided');
    }

    return this.oauthService.getUserInfo(token);
  }
}
