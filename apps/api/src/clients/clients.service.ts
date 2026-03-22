import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { generateToken, hashToken } from '../common/utils/crypto';
import { ClientType, ClientStatus } from '@prisma/client';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async create(params: {
    name: string;
    slug: string;
    type?: ClientType;
    redirectUris: string[];
    postLogoutRedirectUris?: string[];
    scopes?: string[];
  }) {
    const clientId = generateToken(16);
    let clientSecret: string | undefined;
    let clientSecretHash: string | undefined;

    if (params.type === 'CONFIDENTIAL') {
      clientSecret = generateToken(32);
      clientSecretHash = hashToken(clientSecret);
    }

    const client = await this.prisma.client.create({
      data: {
        name: params.name,
        slug: params.slug,
        clientId,
        clientSecretHash,
        type: params.type || 'PUBLIC',
        redirectUris: params.redirectUris,
        postLogoutRedirectUris: params.postLogoutRedirectUris || [],
        scopes: params.scopes || ['openid', 'profile', 'email'],
      },
    });

    return { client, clientSecret };
  }

  async findByClientId(clientId: string) {
    return this.prisma.client.findUnique({ where: { clientId } });
  }

  async validateRedirectUri(clientId: string, redirectUri: string) {
    const client = await this.findByClientId(clientId);
    if (!client) throw new BadRequestException('Invalid client');
    if (client.status !== 'ACTIVE') throw new BadRequestException('Client is inactive');
    if (!client.redirectUris.includes(redirectUri)) {
      throw new BadRequestException('Invalid redirect URI');
    }
    return client;
  }

  async validatePostLogoutRedirectUri(
    clientId: string,
    postLogoutRedirectUri: string,
  ): Promise<boolean> {
    const client = await this.findByClientId(clientId);
    if (!client || client.status !== 'ACTIVE') return false;
    return client.postLogoutRedirectUris.includes(postLogoutRedirectUri);
  }

  async update(id: string, data: {
    name?: string;
    redirectUris?: string[];
    postLogoutRedirectUris?: string[];
    scopes?: string[];
    status?: ClientStatus;
  }) {
    return this.prisma.client.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.redirectUris !== undefined && { redirectUris: data.redirectUris }),
        ...(data.postLogoutRedirectUris !== undefined && { postLogoutRedirectUris: data.postLogoutRedirectUris }),
        ...(data.scopes !== undefined && { scopes: data.scopes }),
        ...(data.status !== undefined && { status: data.status }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        clientId: true,
        type: true,
        redirectUris: true,
        postLogoutRedirectUris: true,
        scopes: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async list(skip = 0, take = 50) {
    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          clientId: true,
          type: true,
          redirectUris: true,
          postLogoutRedirectUris: true,
          scopes: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.client.count(),
    ]);
    return { clients, total };
  }
}
