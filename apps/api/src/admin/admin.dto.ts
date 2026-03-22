import {
  IsString,
  IsOptional,
  IsEmail,
  IsInt,
  Min,
  Max,
  MaxLength,
  Matches,
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
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
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must contain only lowercase letters, numbers, and hyphens' })
  slug: string;

  @IsOptional()
  @IsEnum(ClientType)
  type?: ClientType;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsUrl({}, { each: true })
  @MaxLength(2048, { each: true })
  redirectUris: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({}, { each: true })
  @MaxLength(2048, { each: true })
  postLogoutRedirectUris?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  scopes?: string[];
}

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({}, { each: true })
  @MaxLength(2048, { each: true })
  redirectUris?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({}, { each: true })
  @MaxLength(2048, { each: true })
  postLogoutRedirectUris?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  scopes?: string[];

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;
}
