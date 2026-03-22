import { IsString, IsOptional, IsUrl, MaxLength, Matches, IsIn } from 'class-validator';

export class AuthorizeQueryDto {
  @IsString()
  @IsIn(['code'], { message: 'Only response_type=code is supported' })
  response_type: string;

  @IsString()
  @MaxLength(255)
  client_id: string;

  @IsString()
  @IsUrl()
  @MaxLength(2048)
  redirect_uri: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  scope?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  state?: string;

  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43,128}$/, { message: 'Invalid code_challenge format' })
  code_challenge: string;

  @IsOptional()
  @IsIn(['S256'], { message: 'Only code_challenge_method=S256 is supported' })
  code_challenge_method?: string;
}

export class TokenRequestDto {
  @IsString()
  @IsIn(['authorization_code'], { message: 'Only grant_type=authorization_code is supported' })
  grant_type: string;

  @IsString()
  @MaxLength(512)
  code: string;

  @IsString()
  @MaxLength(255)
  client_id: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  client_secret?: string;

  @IsString()
  @IsUrl()
  @MaxLength(2048)
  redirect_uri: string;

  @IsString()
  @Matches(/^[A-Za-z0-9._~-]{43,128}$/, { message: 'Invalid code_verifier format' })
  code_verifier: string;
}

export class LogoutRequestDto {
  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  post_logout_redirect_uri?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  client_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  token?: string;
}
