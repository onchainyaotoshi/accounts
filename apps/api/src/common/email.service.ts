import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null;
  private from: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!process.env.EMAIL_FROM) {
      this.logger.warn('EMAIL_FROM not set — emails may use an invalid sender address');
    }
    this.from = process.env.EMAIL_FROM || 'noreply@localhost';

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Email sending enabled via Resend');
    } else {
      this.resend = null;
      this.logger.warn('RESEND_API_KEY not set — emails will be logged to console');
    }
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const issuerUrl = process.env.ISSUER_URL;
    if (!issuerUrl) {
      this.logger.error('ISSUER_URL not set — cannot generate password reset link');
      return;
    }
    const resetLink = `${issuerUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const appName = process.env.APP_NAME || 'Accounts';
    const safeAppName = escapeHtml(appName);
    const safeResetLink = escapeHtml(resetLink);

    if (!this.resend) {
      this.logger.log(`[DEV] Password reset email requested`);
      return;
    }

    await this.resend.emails.send({
      from: this.from,
      to,
      subject: `Reset your ${appName} password`,
      html: `
        <p>You requested a password reset for ${safeAppName}.</p>
        <p><a href="${safeResetLink}">Click here to reset your password</a></p>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, ignore this email.</p>
      `,
    });

    this.logger.log('Password reset email sent');
  }
}
