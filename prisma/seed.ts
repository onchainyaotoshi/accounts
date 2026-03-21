import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) throw new Error('ADMIN_EMAIL env var is required for seeding');
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) throw new Error('ADMIN_PASSWORD env var is required for seeding');
  if (adminPassword.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  if (adminPassword === 'CHANGE_ME_BEFORE_SEEDING') throw new Error('ADMIN_PASSWORD must be changed from the default value');
  const seedInviteCode = process.env.SEED_INVITE_CODE;
  if (!seedInviteCode) throw new Error('SEED_INVITE_CODE env var is required for seeding');

  // Create admin user
  const passwordHash = await argon2.hash(adminPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'ADMIN' },
    create: {
      email: adminEmail,
      passwordHash,
      status: 'ACTIVE',
      role: 'ADMIN',
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`Admin user: ${admin.email} (${admin.id})`);

  // Create seed invite code
  const invite = await prisma.inviteCode.upsert({
    where: { code: seedInviteCode },
    update: {},
    create: {
      code: seedInviteCode,
      createdByUserId: admin.id,
      maxUses: 10,
    },
  });

  console.log(`Seed invite code: ${invite.code}`);

  // Create demo client
  const { createHash, randomBytes } = await import('crypto');
  const clientId = randomBytes(16).toString('hex');

  const existingDemo = await prisma.client.findUnique({
    where: { slug: 'demo-client' },
  });

  if (!existingDemo) {
    const client = await prisma.client.create({
      data: {
        name: 'Demo Client',
        slug: 'demo-client',
        clientId,
        type: 'PUBLIC',
        redirectUris: ['http://localhost:3002/callback', 'http://localhost:7769/callback'],
        postLogoutRedirectUris: ['http://localhost:3002', 'http://localhost:7769'],
        scopes: ['openid', 'email'],
      },
    });

    console.log(`Demo client: ${client.name} (clientId: ${client.clientId})`);
  } else {
    console.log(`Demo client already exists (clientId: ${existingDemo.clientId})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
