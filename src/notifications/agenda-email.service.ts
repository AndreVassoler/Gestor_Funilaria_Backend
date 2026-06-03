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
  painelAgendaUrl,
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

  private rodapePainelTexto(): string {
    const url = painelAgendaUrl();
    return url
      ? `Abra a agenda no painel: ${url}`
      : 'Acesse o painel para ver a agenda completa.';
  }

  private rodapePainelHtml(): string {
    const url = painelAgendaUrl();
    if (!url) {
      return '<p style="margin:16px 0 0">Acesse o painel para ver a agenda completa.</p>';
    }
    return `<p style="margin:16px 0 0"><a href="${url}" style="color:#1a6b45">Abrir agenda no painel</a></p>`;
  }

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
      this.rodapePainelTexto(),
    ].join('\n');

    const html = wrapEmailHtml(
      'Novo agendamento',
      `${formatarAgendamentoHtml(agendamento)}${this.rodapePainelHtml()}`,
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
      this.rodapePainelTexto(),
    ].join('\n');

    const html = wrapEmailHtml(
      `Resumo de hoje (${lista.length})`,
      [
        `<p style="margin:0 0 16px">${lista.length} agendamento(s) para <strong>${diaFmt}</strong>:</p>`,
        ...lista.map((a) => formatarAgendamentoHtml(a)),
        this.rodapePainelHtml(),
      ].join(''),
    );

    await this.email.sendMail({ to, subject, text, html });
  }
}
