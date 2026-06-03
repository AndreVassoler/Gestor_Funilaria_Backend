import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import {
  Agendamento,
  AgendamentoStatus,
} from '../agendamentos/agendamento.entity';
import { EmailService } from './email.service';
import {
  formatarAgendamentoHtml,
  formatarAgendamentoTexto,
  formatarDiaBr,
  hojeYmdBr,
  wrapEmailHtml,
} from './agenda-email.format';

@Injectable()
export class AgendaEmailService {
  private readonly logger = new Logger(AgendaEmailService.name);

  constructor(
    private readonly email: EmailService,
    @InjectRepository(Agendamento)
    private readonly agendamentoRepo: Repository<Agendamento>,
  ) {}

  /** Aviso imediato ao cadastrar agendamento. Falhas são apenas logadas. */
  notifyNovoAgendamento(agendamento: Agendamento): void {
    if (!this.email.isConfigured()) return;

    const to = this.email.notifyTo!;
    const diaFmt = formatarDiaBr(agendamento.dia);
    const subject = `[Agenda] Novo agendamento — ${agendamento.cliente} (${diaFmt})`;
    const text = [
      'Novo agendamento cadastrado no Gestor Funilaria:',
      '',
      formatarAgendamentoTexto(agendamento),
      '',
      'Acesse o painel para ver a agenda completa.',
    ].join('\n');

    const html = wrapEmailHtml(
      'Novo agendamento',
      `${formatarAgendamentoHtml(agendamento)}<p style="margin:16px 0 0">Acesse o painel para ver a agenda completa.</p>`,
    );

    void this.email.sendMail({ to, subject, text, html }).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Aviso de novo agendamento #${agendamento.id} não enviado: ${msg}`);
    });
  }

  /** Resumo diário dos agendamentos de hoje (exceto cancelados). */
  async sendResumoDiario(): Promise<void> {
    if (!this.email.isConfigured()) return;

    const hoje = hojeYmdBr();
    const lista = await this.agendamentoRepo.find({
      where: {
        dia: hoje,
        status: Not(AgendamentoStatus.CANCELADO),
      },
      order: { id: 'ASC' },
    });

    const to = this.email.notifyTo!;
    const diaFmt = formatarDiaBr(hoje);

    if (lista.length === 0) {
      this.logger.debug(`Resumo diário (${hoje}): nenhum agendamento; e-mail omitido.`);
      return;
    }

    const subject = `[Agenda] Resumo de hoje — ${lista.length} agendamento${lista.length === 1 ? '' : 's'}`;
    const text = [
      `Resumo da agenda — ${diaFmt}`,
      `${lista.length} agendamento(s):`,
      '',
      ...lista.map((a) => formatarAgendamentoTexto(a)),
      '',
      'Acesse o painel para ver a agenda completa.',
    ].join('\n');

    const html = wrapEmailHtml(
      `Resumo de hoje (${lista.length})`,
      [
        `<p style="margin:0 0 16px">${lista.length} agendamento(s) para <strong>${diaFmt}</strong>:</p>`,
        ...lista.map((a) => formatarAgendamentoHtml(a)),
        '<p style="margin:16px 0 0">Acesse o painel para ver a agenda completa.</p>',
      ].join(''),
    );

    await this.email.sendMail({ to, subject, text, html });
  }
}
