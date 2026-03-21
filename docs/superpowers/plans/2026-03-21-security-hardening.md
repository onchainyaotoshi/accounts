# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical and high-severity security vulnerabilities identified in the security audit.

**Architecture:** Each task targets a specific vulnerability class. Tasks are ordered by dependency — RBAC first (blocks admin fixes), then auth/session fixes, then OAuth fixes, then infra hardening. Each task is independently committable.

**Tech Stack:** NestJS 11, Prisma 6, PostgreSQL 16, TypeScript

---

## File Structure

| File | Responsibility |
|------|---------------|
| `prisma/schema.prisma` | Add `UserRole` enum and `role` field to User model |
| `prisma/seed.ts` | Set admin user role to ADMIN |
| `apps/api/src/common/guards/admin.guard.ts` | New guard — checks `user.role === ADMIN` |
| `apps/api/src/admin/admin.controller.ts` | Add AdminGuard, cap pagination, add IP/UA to audit |
| `apps/api/src/app.module.ts` | Register ThrottlerGuard as APP_GUARD |
| `apps/api/src/auth/auth.service.ts` | Fix race conditions, remove console.log, invalidate old reset tokens |
| `apps/api/src/auth/auth.controller.ts` | Fix clearCookie attributes |
| `apps/api/src/auth/auth.dto.ts` | Add MaxLength to LoginDto.password |
| `apps/api/src/oauth/oauth.service.ts` | Atomic code exchange, PKCE method validation, scope validation, client secret verification |
| `apps/api/src/oauth/oauth.controller.ts` | Add SessionGuard to /me, validate code_challenge, change logout to POST |
| `apps/api/src/oauth/well-known.controller.ts` | Fix endpoint paths |
| `apps/api/src/invites/invites.service.ts` | Atomic validate+consume in signup flow |
| `apps/api/src/clients/clients.service.ts` | Type-safe update method |
| `apps/api/src/main.ts` | Restrict CORS localhost to specific ports, gate behind NODE_ENV |
| `docker-compose.yml` | Parameterize DATABASE_URL, bind postgres to 127.0.0.1, remove mailhog ports in prod |
| `.env.example` | Use placeholder values for credentials |
| `apps/api/src/admin/admin.dto.ts` | Add @Max to maxUses, @IsUrl to redirectUris |

---

### Task 1: Add Role-Based Access Control (RBAC)

**Fixes:** C1 (no admin RBAC), addresses the most critical vulnerability — any user can access admin endpoints.

**Files:**
- Modify: `prisma/schema.prisma:16-33`
- Create: `apps/api/src/common/guards/admin.guard.ts`
- Modify: `apps/api/src/admin/admin.controller.ts:27-29`
- Modify: `prisma/seed.ts:19-28`

- [ ] **Step 1: Add UserRole enum and role field to schema**

In `prisma/schema.prisma`, add enum and field:

```prisma
enum UserRole {
  USER
  ADMIN
}

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  passwordHash    String    @map("password_hash")
  role            UserRole  @default(USER)
  status          UserStatus @default(ACTIVE)
  // ... rest unchanged
}
```

- [ ] **Step 2: Create and apply the migration**

Run:
```bash
docker compose exec api npx prisma migrate dev --name add_user_role --schema=prisma/schema.prisma
```

Expected: Migration created and applied. Existing users get `role: USER` by default.

- [ ] **Step 3: Update seed to set admin role**

In `prisma/seed.ts`, change the admin upsert:

```typescript
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
```

- [ ] **Step 4: Create AdminGuard**

Create `apps/api/src/common/guards/admin.guard.ts`:

```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
```

- [ ] **Step 5: Apply AdminGuard to AdminController**

In `apps/api/src/admin/admin.controller.ts`, add the guard:

```typescript
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('admin')
@UseGuards(SessionGuard, AdminGuard)
export class AdminController {
```

- [ ] **Step 6: Run seed to update existing admin user**

Run:
```bash
docker compose exec api npx prisma db seed
```

Expected: Admin user now has `role: ADMIN`.

- [ ] **Step 7: Verify manually**

Test: Login as admin → admin endpoints work. Login as non-admin → admin endpoints return 403.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ prisma/seed.ts apps/api/src/common/guards/admin.guard.ts apps/api/src/admin/admin.controller.ts
git commit -m "feat: add role-based access control for admin endpoints"
```

---

### Task 2: Activate Global Rate Limiting (ThrottlerGuard)

**Fixes:** H1 (ThrottlerGuard never registered — all @Throttle decorators are no-ops).

**Files:**
- Modify: `apps/api/src/app.module.ts:15-45`

- [ ] **Step 1: Register ThrottlerGuard as APP_GUARD**

In `apps/api/src/app.module.ts`:

```typescript
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    // ... existing imports
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

- [ ] **Step 2: Add @SkipThrottle() to health endpoints**

In `apps/api/src/health/health.controller.ts`, add `@SkipThrottle()` at controller level so health checks aren't rate limited:

```typescript
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@Controller()
export class HealthController {
```

- [ ] **Step 3: Verify rate limiting is active**

Test: Hit `POST /auth/login` 6 times in 60 seconds → 6th should return 429 Too Many Requests.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/app.module.ts apps/api/src/health/health.controller.ts
git commit -m "fix: register ThrottlerGuard globally to activate rate limiting"
```

---

### Task 3: Remove Password Reset Token Logging

**Fixes:** C3 (reset token logged to stdout in all environments).

**Files:**
- Modify: `apps/api/src/auth/auth.service.ts:171-173`

- [ ] **Step 1: Remove console.log and TODO**

In `apps/api/src/auth/auth.service.ts`, replace lines 171-173:

```typescript
    // TODO: Send email with reset link containing `token`
    // For dev: log token
    console.log(`[DEV] Password reset token for ${email}: ${token}`);
```

With:

```typescript
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Password reset token for ${email}: ${token}`);
    }
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/auth/auth.service.ts
git commit -m "fix: gate password reset token logging behind NODE_ENV=development"
```

---

### Task 4: Fix Race Conditions (Invite Consumption + Auth Code Exchange)

**Fixes:** C2 (invite exhaustion race), C4 (auth code double exchange).

**Files:**
- Modify: `apps/api/src/auth/auth.service.ts:100-146`
- Modify: `apps/api/src/oauth/oauth.service.ts:60-125`

- [ ] **Step 1: Make signup invite flow atomic**

In `apps/api/src/auth/auth.service.ts`, replace the `signupWithInvite` method body (lines 107-145) to wrap validate+create+consume in a Prisma interactive transaction:

```typescript
  async signupWithInvite(params: {
    email: string;
    password: string;
    inviteCode: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const existing = await this.usersService.findByEmail(params.email);
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    const { user, invite } = await this.prisma.$transaction(async (tx) => {
      const invite = await tx.inviteCode.findUnique({
        where: { code: params.inviteCode.toUpperCase().trim() },
      });

      if (!invite) throw new BadRequestException('Invalid invite code');
      if (invite.revokedAt) throw new BadRequestException('Invite code has been revoked');
      if (invite.expiresAt && invite.expiresAt < new Date()) throw new BadRequestException('Invite code has expired');
      if (invite.usedCount >= invite.maxUses) throw new BadRequestException('Invite code has reached maximum uses');
      if (invite.assignedEmail && params.email && invite.assignedEmail !== params.email.toLowerCase().trim()) {
        throw new BadRequestException('Invite code is not assigned to this email');
      }

      const user = await this.usersService.createInTransaction(tx, params.email, params.password);

      await tx.inviteCode.update({
        where: { id: invite.id },
        data: { usedCount: { increment: 1 } },
      });

      await tx.inviteCodeUsage.create({
        data: {
          inviteCodeId: invite.id,
          usedByUserId: user.id,
          usedEmail: params.email.toLowerCase().trim(),
        },
      });

      return { user, invite };
    });

    await this.auditService.log({
      eventType: 'SIGNUP',
      userId: user.id,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: { inviteCodeId: invite.id },
    });

    await this.auditService.log({
      eventType: 'INVITE_USED',
      userId: user.id,
      ipAddress: params.ipAddress,
      metadata: { inviteCodeId: invite.id },
    });

    const { token } = await this.sessionsService.create({
      userId: user.id,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return {
      user: { id: user.id, email: user.email, status: user.status },
      sessionToken: token,
    };
  }
```

- [ ] **Step 1b: Add createInTransaction method to UsersService**

In `apps/api/src/users/users.service.ts`, add this method after the existing `create` method (line 28):

```typescript
  async createInTransaction(tx: any, email: string, password: string): Promise<User> {
    const passwordHash = await hashPassword(password);
    return tx.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
      },
    });
  }
```

This is the same logic as `create()` but uses the transaction client `tx` instead of `this.prisma`.

- [ ] **Step 2: Make auth code exchange atomic + add client secret verification**

In `apps/api/src/oauth/oauth.service.ts`, replace the `exchangeCode` method entirely. This combined version fixes the race condition (C4) AND enforces client secret for confidential clients (C5):

```typescript
  async exchangeCode(params: {
    code: string;
    clientId: string;
    clientSecret?: string;
    redirectUri: string;
    codeVerifier: string;
  }) {
    const codeHash = hashToken(params.code);

    const authCode = await this.prisma.authCode.findUnique({
      where: { codeHash },
      include: { user: true, client: true },
    });

    if (!authCode || authCode.consumedAt || authCode.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired authorization code');
    }

    if (authCode.client.clientId !== params.clientId) {
      throw new BadRequestException('Client mismatch');
    }

    if (authCode.redirectUri !== params.redirectUri) {
      throw new BadRequestException('Redirect URI mismatch');
    }

    // Verify client secret for confidential clients
    if (authCode.client.type === 'CONFIDENTIAL') {
      if (!params.clientSecret) {
        throw new BadRequestException('Client secret required for confidential clients');
      }
      const secretHash = hashToken(params.clientSecret);
      if (secretHash !== authCode.client.clientSecretHash) {
        throw new BadRequestException('Invalid client secret');
      }
    }

    // Verify PKCE
    const expectedChallenge = createHash('sha256')
      .update(params.codeVerifier)
      .digest('base64url');

    if (expectedChallenge !== authCode.codeChallenge) {
      throw new BadRequestException('Invalid code verifier');
    }

    // Atomic consume — if count is 0, another request already consumed it
    const consumed = await this.prisma.authCode.updateMany({
      where: { id: authCode.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    if (consumed.count === 0) {
      throw new BadRequestException('Authorization code already used');
    }

    // Create session token for the client
    const sessionToken = generateToken();
    const sessionTokenHash = hashToken(sessionToken);

    await this.prisma.session.create({
      data: {
        userId: authCode.userId,
        clientId: authCode.client.id,
        sessionTokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await this.auditService.log({
      eventType: 'TOKEN_ISSUED',
      userId: authCode.userId,
      clientId: authCode.client.id,
    });

    return {
      access_token: sessionToken,
      token_type: 'Bearer',
      expires_in: 30 * 24 * 60 * 60,
      scope: authCode.scope,
    };
  }
```

- [ ] **Step 3: Verify both flows work**

Test signup with invite code. Test OAuth PKCE flow end-to-end via demo client.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/auth/auth.service.ts apps/api/src/oauth/oauth.service.ts apps/api/src/users/users.service.ts
git commit -m "fix: prevent race conditions in invite consumption and auth code exchange"
```

---

### Task 5: Wire Client Secret Through Controller + OIDC Discovery

**Fixes:** C5 controller wiring (service-level verification was added in Task 4 Step 2).

**Files:**
- Modify: `apps/api/src/oauth/oauth.controller.ts:60-84`
- Modify: `apps/api/src/oauth/well-known.controller.ts:19`

- [ ] **Step 1: Accept client_secret in token request**

In `apps/api/src/oauth/oauth.controller.ts`, replace the `token` method:

```typescript
  @Post('token')
  @HttpCode(HttpStatus.OK)
  async token(
    @Body('grant_type') grantType: string,
    @Body('code') code: string,
    @Body('client_id') clientId: string,
    @Body('client_secret') clientSecret: string,
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
      clientSecret,
      redirectUri,
      codeVerifier,
    });
  }
```

- [ ] **Step 2: Update OIDC discovery to advertise client_secret_post**

In `apps/api/src/oauth/well-known.controller.ts`, change:

```typescript
token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/oauth/oauth.controller.ts apps/api/src/oauth/well-known.controller.ts
git commit -m "fix: accept client_secret in token endpoint, update OIDC discovery"
```

---

### Task 6: Fix Session Revocation in Password Reset + Invalidate Old Tokens

**Fixes:** H7 (session revocation outside transaction), M4 (old reset tokens not invalidated).

**Files:**
- Modify: `apps/api/src/auth/auth.service.ts:178-222`

- [ ] **Step 1: Include session revocation and old token invalidation in transaction**

In `apps/api/src/auth/auth.service.ts`, replace the resetPassword transaction block:

```typescript
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { consumedAt: new Date() },
      }),
      // Invalidate all other outstanding reset tokens for this user
      this.prisma.passwordResetToken.updateMany({
        where: {
          userId: resetToken.userId,
          id: { not: resetToken.id },
          consumedAt: null,
        },
        data: { consumedAt: new Date() },
      }),
      // Revoke all sessions atomically
      this.prisma.session.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
```

Remove the separate `this.sessionsService.revokeAllForUser(resetToken.userId)` call after the transaction.

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/auth/auth.service.ts
git commit -m "fix: make session revocation and token invalidation atomic in password reset"
```

---

### Task 7: Fix /me Endpoint and OAuth Controller Issues

**Fixes:** H5 (/me has no guard), H6 (PKCE plain not rejected), M2 (OIDC discovery wrong paths), M8 (scope not validated).

**Files:**
- Modify: `apps/api/src/oauth/oauth.controller.ts:24-57, 114-126`
- Modify: `apps/api/src/oauth/oauth.service.ts:22-58`
- Modify: `apps/api/src/oauth/well-known.controller.ts:10-22`

- [ ] **Step 1: Add SessionGuard to /me endpoint**

In `apps/api/src/oauth/oauth.controller.ts`, replace the `me` method:

```typescript
  @Get('me')
  @UseGuards(SessionGuard)
  async me(@CurrentUser() user: User) {
    return {
      sub: user.id,
      email: user.email,
      email_verified: !!user.emailVerifiedAt,
    };
  }
```

Add `User` import if not already present.

- [ ] **Step 2: Reject non-S256 code_challenge_method**

In `apps/api/src/oauth/oauth.controller.ts`, in the `authorize` method after the missing params check:

```typescript
    if (codeChallengeMethod && codeChallengeMethod !== 'S256') {
      throw new BadRequestException('Only code_challenge_method=S256 is supported');
    }
```

- [ ] **Step 3: Validate scope against client's registered scopes**

In `apps/api/src/oauth/oauth.service.ts`, in `createAuthCode`, after `validateRedirectUri`:

```typescript
    // Validate and filter requested scopes against client's registered scopes
    const requestedScopes = (params.scope || 'openid email').split(' ');
    const allowedScopes = requestedScopes.filter(s => client.scopes.includes(s));
    if (allowedScopes.length === 0) {
      throw new BadRequestException('No valid scopes requested');
    }
    const scope = allowedScopes.join(' ');
```

Use `scope` instead of `params.scope || 'openid email'` in the `create` call.

- [ ] **Step 4: Fix OIDC discovery endpoint paths**

In `apps/api/src/oauth/well-known.controller.ts`, fix the paths:

```typescript
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
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/oauth/oauth.controller.ts apps/api/src/oauth/oauth.service.ts apps/api/src/oauth/well-known.controller.ts
git commit -m "fix: secure /me endpoint, reject plain PKCE, validate scopes, fix OIDC discovery paths"
```

---

### Task 8: Fix Auth DTO and Cookie Issues

**Fixes:** M5 (LoginDto no MaxLength), M6 (clearCookie missing attributes). Note: M3 (invite code in audit log) is already fixed by Task 4's rewrite of `signupWithInvite` which omits `code` from metadata.

**Files:**
- Modify: `apps/api/src/auth/auth.dto.ts:3-10`
- Modify: `apps/api/src/auth/auth.controller.ts:58`

- [ ] **Step 1: Add MaxLength to LoginDto.password**

In `apps/api/src/auth/auth.dto.ts`:

```typescript
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
```

- [ ] **Step 2: Fix clearCookie attributes in logout**

In `apps/api/src/auth/auth.controller.ts`, replace line 58:

```typescript
    res.clearCookie('session_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/auth/auth.dto.ts apps/api/src/auth/auth.controller.ts
git commit -m "fix: add password MaxLength, fix clearCookie attributes on logout"
```

---

### Task 9: Harden CORS Configuration

**Fixes:** M1 (CORS wildcard allows all localhost ports and all subdomains).

**Files:**
- Modify: `apps/api/src/main.ts:21-39`

- [ ] **Step 1: Restrict CORS origins**

In `apps/api/src/main.ts`, replace the CORS config:

```typescript
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);

      const allowedList =
        process.env.CORS_ORIGINS?.split(',') || ['http://localhost:7768'];
      if (allowedList.includes(origin)) return callback(null, true);

      if (process.env.NODE_ENV !== 'production' && /^https:\/\/[\w-]+\.yaotoshi\.xyz$/.test(origin)) {
        return callback(null, true);
      }

      if (process.env.NODE_ENV === 'development' && /^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });
```

In production, only explicit `CORS_ORIGINS` are allowed. The `*.yaotoshi.xyz` wildcard is restricted to non-production. The `localhost:*` wildcard is restricted to development only.

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/main.ts
git commit -m "fix: restrict CORS wildcards to development/non-production environments"
```

---

### Task 10: Harden Infrastructure (docker-compose)

**Fixes:** C6 (hardcoded DATABASE_URL), H8 (postgres port exposed), H9 (mailhog exposed).

**Files:**
- Modify: `docker-compose.yml:9-10, 27, 58-60`
- Modify: `.env.example:1-5, 17-21`

- [ ] **Step 1: Parameterize DATABASE_URL**

In `docker-compose.yml`, change line 27 from:

```yaml
      DATABASE_URL: postgresql://accounts:accounts_secret@postgres:5432/accounts_db
```

To:

```yaml
      DATABASE_URL: postgresql://${POSTGRES_USER:-accounts}:${POSTGRES_PASSWORD:-accounts_secret}@postgres:5432/${POSTGRES_DB:-accounts_db}
```

- [ ] **Step 2: Bind postgres to loopback**

In `docker-compose.yml`, change line 10 from:

```yaml
      - "5435:5432"
```

To:

```yaml
      - "127.0.0.1:5435:5432"
```

- [ ] **Step 3: Bind mailhog to loopback**

In `docker-compose.yml`, change lines 59-60 from:

```yaml
      - "1025:1025"
      - "8025:8025"
```

To:

```yaml
      - "127.0.0.1:1025:1025"
      - "127.0.0.1:8025:8025"
```

- [ ] **Step 4: Use placeholder values in .env.example**

In `.env.example`, change:

```
ADMIN_PASSWORD=CHANGE_ME_BEFORE_SEEDING
SEED_INVITE_CODE=CHANGE_ME_BEFORE_SEEDING
```

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "fix: parameterize DATABASE_URL, bind exposed ports to loopback, use placeholder credentials"
```

---

### Task 11: Harden Admin Input Validation and Pagination

**Fixes:** H10 (unbounded take), M10 (redirectUris not validated as URLs), various admin DTO issues.

**Files:**
- Modify: `apps/api/src/admin/admin.controller.ts:40-53, 133-140`
- Modify: `apps/api/src/admin/admin.dto.ts:18-52`
- Modify: `apps/api/src/clients/clients.service.ts:66-68`

- [ ] **Step 1: Cap pagination take parameter**

In `apps/api/src/admin/admin.controller.ts`, replace all `take ? parseInt(take) : 50` with:

```typescript
Math.min(take ? parseInt(take) || 50 : 50, 100)
```

And replace all `skip ? parseInt(skip) : 0` with:

```typescript
Math.max(skip ? parseInt(skip) || 0 : 0, 0)
```

Apply to `listUsers`, `listInvites`, and `listAuditLogs`.

- [ ] **Step 2: Add @Max to CreateInviteDto.maxUses**

In `apps/api/src/admin/admin.dto.ts`:

```typescript
import { Max } from 'class-validator';

// In CreateInviteDto:
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  maxUses?: number;
```

- [ ] **Step 3: Add @IsUrl to redirectUris**

In `apps/api/src/admin/admin.dto.ts`, for both CreateClientDto and UpdateClientDto:

```typescript
import { IsUrl } from 'class-validator';

  @IsArray()
  @IsUrl({}, { each: true })
  redirectUris: string[];
```

- [ ] **Step 4: Type-safe update in ClientsService**

In `apps/api/src/clients/clients.service.ts`, replace line 66-68:

```typescript
  async update(id: string, data: { name?: string; redirectUris?: string[]; status?: ClientStatus }) {
    return this.prisma.client.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.redirectUris !== undefined && { redirectUris: data.redirectUris }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });
  }
```

Add `import { ClientStatus } from '@prisma/client';` if not already imported.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/admin/admin.controller.ts apps/api/src/admin/admin.dto.ts apps/api/src/clients/clients.service.ts
git commit -m "fix: cap pagination, validate redirectUris as URLs, type-safe client update"
```

---

### Task 12: Stop Storing Raw Session Token on Request

**Fixes:** M6 from session guard review (raw token on request object), H2 partially (document Bearer token risk).

**Files:**
- Modify: `apps/api/src/common/guards/session.guard.ts:47`

- [ ] **Step 1: Remove raw token from request object**

In `apps/api/src/common/guards/session.guard.ts`, remove line 47:

```typescript
    (request as any).session_token = token;
```

- [ ] **Step 2: Verify nothing else reads request.session_token**

Search codebase for `session_token` references that read from request (not cookies). The OAuth logout already reads from `req.cookies?.session_token` which is the cookie, not the guard-attached value. The auth logout also reads from cookies. This removal should be safe.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/common/guards/session.guard.ts
git commit -m "fix: stop propagating raw session token on request object"
```

---

## Summary

| Task | Severity Fixed | Description |
|------|---------------|-------------|
| 1 | Critical | RBAC for admin endpoints |
| 2 | High | Activate ThrottlerGuard globally |
| 3 | Critical | Gate reset token logging |
| 4 | Critical x3 | Race conditions (invite + auth code) + client secret verification |
| 5 | Critical | Wire client_secret through controller + OIDC discovery |
| 6 | High + Medium | Atomic password reset + token invalidation |
| 7 | High x2 + Medium x2 | /me guard, PKCE validation, scope validation, OIDC paths |
| 8 | Medium x2 | LoginDto MaxLength, clearCookie (audit log cleanup absorbed by Task 4) |
| 9 | Medium | CORS hardening |
| 10 | Critical + High x2 | Infrastructure hardening |
| 11 | High + Medium x2 | Pagination caps, input validation |
| 12 | Medium | Remove raw token from request |

**Total: 6 Critical, 8 High, 10 Medium fixes across 12 tasks.**
