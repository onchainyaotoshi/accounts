import {
  IsString,
  IsOptional,
  IsEmail,
  IsInt,
  Min,
  Max,
  IsArray,
  IsEnum,
  IsDateString,
  IsUrl,
} from 'class-validator';
import { ClientType, ClientStatus } from '@prisma/client';

export class CreateInviteDto {
  @IsOptional()
  @IsEmail()
  assignedEmail?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  maxUses?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class CreateClientDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsEnum(ClientType)
  type?: ClientType;

  @IsArray()
  @IsUrl({}, { each: true })
  redirectUris: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  postLogoutRedirectUris?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];
}

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  redirectUris?: string[];

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;
}
