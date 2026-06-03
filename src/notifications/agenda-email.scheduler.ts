import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AgendaEmailService } from './agenda-email.service';

@Injectable()
export class AgendaEmailScheduler {
  private readonly logger = new Logger(AgendaEmailScheduler.name);

  constructor(private readonly agendaEmail: AgendaEmailService) {}

  /** Resumo diário às 07:00 (horário de Brasília). */
  @Cron('0 7 * * *', { timeZone: 'America/Sao_Paulo' })
  async resumoDiario(): Promise<void> {
    try {
      await this.agendaEmail.sendResumoDiario();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Resumo diário da agenda falhou: ${msg}`);
    }
  }
}
