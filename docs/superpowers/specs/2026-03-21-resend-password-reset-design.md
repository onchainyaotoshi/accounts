# Email Password Reset via Resend

## Goal

Enable password reset via email using Resend. When a user requests a password reset, they receive an email with a reset link instead of the token being lost (production) or printed to console (development).

## Changes

### 1. Install `resend` package

Add `resend` as a dependency to the API app.

### 2. Create `EmailService`

New service at `apps/api/src/common/email.service.ts`:

- Wraps Resend API
- Single method: `sendPasswordResetEmail(to: string, token: string)`
- Constructs reset link: `{ISSUER_URL}/reset-password?token={token}`
- Sends email with subject "Reset your password" and a simple HTML body containing the link
- If `RESEND_API_KEY` is not set, falls back to `console.log` (development mode)

### 3. Update `AuthService.forgotPassword`

In `apps/api/src/auth/auth.service.ts`:

- Inject `EmailService`
- Replace the `console.log` block with `emailService.sendPasswordResetEmail(email, token)`
- Remove the `NODE_ENV` check — `EmailService` handles the fallback internally

### 4. Create `/reset-password` page in frontend

New page at `apps/web/app/reset-password/page.tsx`:

- Reads `token` from URL query string (`?token=xxx`)
- Shows form: new password + confirm password
- Submits to `POST /auth/reset-password` with `{ token, newPassword }`
- On success: show "Password reset successfully" message with link to login
- On error: show error message

### 5. Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RESEND_API_KEY` | No | *(empty)* | Resend API key. If not set, emails are logged to console instead |
| `EMAIL_FROM` | No | `noreply@example.com` | Sender email address. Must match your verified Resend domain |

### 6. Docker Compose

- Add `RESEND_API_KEY` and `EMAIL_FROM` to api service environment
- Remove commented-out mailhog service

### 7. `.env.example`

Add:

```env
# Email (Resend)
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=noreply@yourdomain.com
```

## What Does NOT Change

- Login flow
- Signup flow
- Auth SDK
- Admin panel
- OAuth endpoints
- Session management
