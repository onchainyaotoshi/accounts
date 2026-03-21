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
