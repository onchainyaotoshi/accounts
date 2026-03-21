import { Controller, Get } from '@nestjs/common';

@Controller('.well-known')
export class WellKnownController {
  @Get('openid-configuration')
  getOpenIdConfiguration() {
    const issuer =
      process.env.ISSUER_URL || 'https://accounts.yaotoshi.xyz';

    return {
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      userinfo_endpoint: `${issuer}/me`,
      end_session_endpoint: `${issuer}/logout`,
      scopes_supported: ['openid', 'email', 'profile'],
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
      code_challenge_methods_supported: ['S256'],
      subject_types_supported: ['public'],
    };
  }
}
