import { IsString, IsOptional, IsUrl, MaxLength } from 'class-validator';

export class AuthorizeQueryDto {
  @IsString()
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
  @MaxLength(2048)
  state?: string;

  @IsString()
  @MaxLength(128)
  code_challenge: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  code_challenge_method?: string;
}

export class TokenRequestDto {
  @IsString()
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
  @MaxLength(128)
  code_verifier: string;
}

export class LogoutRequestDto {
  @IsOptional()
  @IsString()
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
