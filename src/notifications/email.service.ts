import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export type SendMailOptions = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  /** Destinatário dos avisos da agenda (dono da oficina). */
  get notifyTo(): string | null {
    const raw = process.env.NOTIFY_EMAIL_TO?.trim();
    return raw || null;
  }

  isConfigured(): boolean {
    return (
      Boolean(this.notifyTo) &&
      Boolean(process.env.SMTP_HOST?.trim()) &&
      Boolean(process.env.SMTP_USER?.trim()) &&
      Boolean(process.env.SMTP_PASS)
    );
  }

  private fromAddress(): string {
    const custom = process.env.NOTIFY_EMAIL_FROM?.trim();
    if (custom) return custom;
    const user = process.env.SMTP_USER?.trim() ?? '';
    return `"Gestor Funilaria" <${user}>`;
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      const port = Number(process.env.SMTP_PORT ?? 587);
      const secure =
        process.env.SMTP_SECURE === 'true' || port === 465;

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST?.trim(),
        port,
        secure,
        auth: {
          user: process.env.SMTP_USER?.trim(),
          pass: process.env.SMTP_PASS,
        },
      });
    }
    return this.transporter;
  }

  async sendMail(opts: SendMailOptions): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.debug(
        'E-mail não configurado (NOTIFY_EMAIL_TO / SMTP_*); envio ignorado.',
      );
      return;
    }

    const to = opts.to.trim();
    if (!to) return;

    try {
      await this.getTransporter().sendMail({
        from: this.fromAddress(),
        to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
      });
      this.logger.log(`E-mail enviado: "${opts.subject}" → ${to}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Falha ao enviar e-mail "${opts.subject}": ${msg}`);
      throw err;
    }
  }
}
