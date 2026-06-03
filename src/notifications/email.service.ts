import { Injectable, Logger } from '@nestjs/common';
import * as dns from 'dns';
import * as nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
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
  private transporterInit: Promise<Transporter> | null = null;

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

  /**
   * Nodemailer 8 resolve IPv4+IPv6 e pode tentar IPv6 primeiro.
   * No Railway (sem egress IPv6) usamos só o IPv4 de resolve4() como host.
   */
  private async buildTransporter(): Promise<Transporter> {
    const smtpHostname = process.env.SMTP_HOST?.trim() ?? '';
    const port = Number(process.env.SMTP_PORT ?? 587);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    let connectHost = smtpHostname;
    if (smtpHostname && !/^\d{1,3}(\.\d{1,3}){3}$/.test(smtpHostname)) {
      try {
        const ipv4 = await dns.promises.resolve4(smtpHostname);
        if (ipv4[0]) {
          connectHost = ipv4[0];
          this.logger.log(`SMTP IPv4: ${smtpHostname} → ${connectHost}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `SMTP resolve4 falhou para ${smtpHostname} (${msg}); usando hostname`,
        );
      }
    }

    const options: SMTPTransport.Options = {
      host: connectHost,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER?.trim(),
        pass: process.env.SMTP_PASS,
      },
      tls: {
        servername: smtpHostname,
      },
    };

    return nodemailer.createTransport(options);
  }

  private async getTransporter(): Promise<Transporter> {
    if (this.transporter) {
      return this.transporter;
    }
    if (!this.transporterInit) {
      this.transporterInit = this.buildTransporter().then((t) => {
        this.transporter = t;
        return t;
      });
    }
    return this.transporterInit;
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
      const transporter = await this.getTransporter();
      await transporter.sendMail({
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
