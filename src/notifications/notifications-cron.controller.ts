import { Controller, Post, UseGuards } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { AgendaEmailService } from './agenda-email.service';
import { NotifyCronGuard } from './notify-cron.guard';

/**
 * Disparo do resumo diário por cron externo (GitHub Actions).
 * Necessário no Railway com sleep: o @Cron interno pode não rodar às 07:00.
 */
@Controller('notifications/cron')
export class NotificationsCronController {
  constructor(private readonly agendaEmail: AgendaEmailService) {}

  @Public()
  @UseGuards(NotifyCronGuard)
  @Post('agenda-resumo')
  async agendaResumo(): Promise<{ ok: true; skipped?: boolean }> {
    await this.agendaEmail.sendResumoDiario();
    return { ok: true };
  }
}
