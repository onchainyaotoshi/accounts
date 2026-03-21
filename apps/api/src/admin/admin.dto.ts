import {
  IsString,
  IsOptional,
  IsEmail,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsArray,
  IsEnum,
  IsDateString,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClientType, ClientStatus } from '@prisma/client';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}

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
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(255)
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
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  redirectUris?: string[];

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;
}
