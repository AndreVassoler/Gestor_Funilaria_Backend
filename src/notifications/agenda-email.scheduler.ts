import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AgendaEmailService } from './agenda-email.service';

@Injectable()
export class AgendaEmailScheduler {
  private readonly logger = new Logger(AgendaEmailScheduler.name);

  constructor(private readonly agendaEmail: AgendaEmailService) {}

  /**
   * Resumo às 07:00 (Brasília). Desligado em produção no Railway — use GitHub Actions
   * (keep_alive → job agenda-email). Ative só em dev: NOTIFY_RESUMO_INTERNAL_CRON=true
   */
  @Cron('0 7 * * *', {
    timeZone: 'America/Sao_Paulo',
    disabled: process.env.NOTIFY_RESUMO_INTERNAL_CRON !== 'true',
  })
  async resumoDiario(): Promise<void> {
    try {
      await this.agendaEmail.sendResumoDiario();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Resumo diário da agenda falhou: ${msg}`);
    }
  }
}
