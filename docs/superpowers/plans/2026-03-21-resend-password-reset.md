# Resend Password Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send password reset emails via Resend instead of logging tokens to console.

**Architecture:** Add `resend` package and an `EmailService` that wraps it. Update `AuthService.forgotPassword` to call `EmailService` instead of `console.log`. Frontend reset page already exists. Falls back to console.log when `RESEND_API_KEY` is not set.

**Tech Stack:** Resend SDK, NestJS 11

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `apps/api/src/common/email.service.ts` | Create | Wraps Resend API, sends password reset emails |
| `apps/api/src/common/email.module.ts` | Create | Global module exporting EmailService |
| `apps/api/src/auth/auth.service.ts` | Modify | Use EmailService instead of console.log |
| `apps/api/src/auth/auth.module.ts` | Modify | Import EmailModule (if not global) |
| `docker-compose.yml` | Modify | Add RESEND_API_KEY, EMAIL_FROM; remove mailhog |
| `.env.example` | Modify | Add RESEND_API_KEY, EMAIL_FROM |
| `README.md` | Modify | Document email setup |

---

### Task 1: Install Resend + Create EmailService

**Files:**
- Create: `apps/api/src/common/email.service.ts`
- Create: `apps/api/src/common/email.module.ts`

- [ ] **Step 1: Install resend package**

```bash
cd /home/claude/devops/accounts && pnpm add resend --filter @accounts/api
```

- [ ] **Step 2: Create EmailService**

Create `apps/api/src/common/email.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null;
  private from: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.from = process.env.EMAIL_FROM || 'noreply@example.com';

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Email sending enabled via Resend');
    } else {
      this.resend = null;
      this.logger.warn('RESEND_API_KEY not set — emails will be logged to console');
    }
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const issuerUrl = process.env.ISSUER_URL || 'http://localhost:9999';
    const resetLink = `${issuerUrl}/reset-password?token=${token}`;
    const appName = process.env.APP_NAME || 'Accounts';

    if (!this.resend) {
      this.logger.log(`[DEV] Password reset link for ${to}: ${resetLink}`);
      return;
    }

    await this.resend.emails.send({
      from: this.from,
      to,
      subject: `Reset your ${appName} password`,
      html: `
        <p>You requested a password reset.</p>
        <p><a href="${resetLink}">Click here to reset your password</a></p>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, ignore this email.</p>
      `,
    });

    this.logger.log(`Password reset email sent to ${to}`);
  }
}
```

- [ ] **Step 3: Create EmailModule**

Create `apps/api/src/common/email.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
```

- [ ] **Step 4: Register EmailModule in AppModule**

In `apps/api/src/app.module.ts`, add:

```typescript
import { EmailModule } from './common/email.module';
```

Add `EmailModule` to the `imports` array.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/common/email.service.ts apps/api/src/common/email.module.ts apps/api/src/app.module.ts apps/api/package.json pnpm-lock.yaml
git commit -m "feat: add EmailService with Resend integration"
```

---

### Task 2: Update AuthService to Use EmailService

**Files:**
- Modify: `apps/api/src/auth/auth.service.ts:218-244`

- [ ] **Step 1: Inject EmailService into AuthService**

In `apps/api/src/auth/auth.service.ts`, add to imports:

```typescript
import { EmailService } from '../common/email.service';
```

Add to the constructor:

```typescript
    private emailService: EmailService,
```

- [ ] **Step 2: Replace console.log with EmailService call**

In the `forgotPassword` method, find this block (around lines 241-244):

```typescript
    if (process.env.NODE_ENV === 'development') {
      // TODO: Send email with reset link containing `token`
      console.log(`[DEV] Password reset token for ${email}: ${token}`);
    }
```

Replace with:

```typescript
    await this.emailService.sendPasswordResetEmail(email, token);
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/auth/auth.service.ts
git commit -m "feat: send password reset emails via Resend"
```

---

### Task 3: Config + Cleanup

**Files:**
- Modify: `docker-compose.yml`
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Update docker-compose.yml**

Add `RESEND_API_KEY` and `EMAIL_FROM` to the api service environment (after `APP_DOMAIN`):

```yaml
      RESEND_API_KEY: ${RESEND_API_KEY:-}
      EMAIL_FROM: ${EMAIL_FROM:-noreply@example.com}
```

Remove the commented-out mailhog service entirely (lines 57-62):

```yaml
  # mailhog:
  #   restart: unless-stopped
  #   image: mailhog/mailhog:latest
  #   ports:
  #     - "127.0.0.1:1025:1025"
  #     - "127.0.0.1:8025:8025"
```

- [ ] **Step 2: Update .env.example**

Add at the end:

```env
# Email (Resend) — optional, emails logged to console if not set
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=noreply@yourdomain.com
```

- [ ] **Step 3: Update README.md**

In the Configuration section, under "Other", add a row for `RESEND_API_KEY` and `EMAIL_FROM`:

| Variable | Default | Description |
|----------|---------|-------------|
| `RESEND_API_KEY` | *(empty)* | Resend API key. Get one at resend.com. If not set, reset emails are logged to console |
| `EMAIL_FROM` | `noreply@example.com` | Sender email. Must match your verified Resend domain |

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml .env.example README.md
git commit -m "feat: add Resend config, remove mailhog, update docs"
```

---

## Summary

| Task | Files | What it does |
|------|-------|-------------|
| 1 | email.service.ts, email.module.ts, app.module.ts | EmailService + Resend integration |
| 2 | auth.service.ts | Wire forgotPassword to EmailService |
| 3 | docker-compose.yml, .env.example, README.md | Config + cleanup |
