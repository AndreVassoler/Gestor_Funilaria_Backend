import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { google } from 'googleapis';
import { Repository } from 'typeorm';
import { Agendamento, AgendamentoStatus } from '../agendamentos/agendamento.entity';
import { GoogleCalendarToken } from './google-calendar-token.entity';
import { withHttpSchemeIfMissing } from './http-url.util';

const TOKEN_ROW_ID = 1;
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';

function env(name: string): string {
  return (process.env[name] ?? '').trim();
}

function addOneDayYmd(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d + 1);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function statusLabel(s: AgendamentoStatus): string {
  switch (s) {
    case AgendamentoStatus.AGENDADO:
      return 'Agendado';
    case AgendamentoStatus.CONFIRMADO:
      return 'Confirmado';
    case AgendamentoStatus.CANCELADO:
      return 'Cancelado';
    case AgendamentoStatus.FINALIZADO:
      return 'Finalizado';
    default:
      return s;
  }
}

function formatGoogleApiError(e: unknown): string {
  const err = e as {
    message?: string;
    response?: { status?: number; data?: unknown };
  };
  const base = err.message ?? String(e);
  const data = err.response?.data;
  if (data !== undefined && data !== null) {
    const extra =
      typeof data === 'string' ? data : JSON.stringify(data);
    return `${base} | ${extra}`;
  }
  return base;
}

@Injectable()
export class GoogleCalendarService {
  private readonly log = new Logger(GoogleCalendarService.name);

  constructor(
    @InjectRepository(GoogleCalendarToken)
    private readonly tokenRepo: Repository<GoogleCalendarToken>,
  ) {}

  isOAuthConfigured(): boolean {
    return Boolean(
      env('GOOGLE_CALENDAR_CLIENT_ID') &&
        env('GOOGLE_CALENDAR_CLIENT_SECRET') &&
        env('GOOGLE_CALENDAR_REDIRECT_URI'),
    );
  }

  async isConnected(): Promise<boolean> {
    const row = await this.tokenRepo.findOne({ where: { id: TOKEN_ROW_ID } });
    return Boolean(row?.refreshToken);
  }

  /** URI exatamente como na requisição OAuth (cadastre igual no Google Cloud). */
  getEffectiveRedirectUri(): string | null {
    if (!this.isOAuthConfigured()) return null;
    return withHttpSchemeIfMissing(env('GOOGLE_CALENDAR_REDIRECT_URI'));
  }

  /** Client ID carregado do .env (público; use para abrir o cliente certo no Console). */
  getConfiguredClientId(): string | null {
    const id = env('GOOGLE_CALENDAR_CLIENT_ID');
    return id || null;
  }

  private oauth2Client() {
    const clientId = env('GOOGLE_CALENDAR_CLIENT_ID');
    const clientSecret = env('GOOGLE_CALENDAR_CLIENT_SECRET');
    const redirectUri = withHttpSchemeIfMissing(env('GOOGLE_CALENDAR_REDIRECT_URI'));
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  buildAuthUrl(): string {
    return this.oauth2Client().generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [SCOPE],
    });
  }

  async saveTokensFromCode(code: string): Promise<void> {
    const client = this.oauth2Client();
    const { tokens } = await client.getToken(code);
    const refresh = tokens.refresh_token;
    if (!refresh) {
      throw new Error(
        'Google não devolveu refresh_token. Revogue o acesso em myaccount.google.com/permissions e conecte de novo.',
      );
    }
    await this.tokenRepo.save({
      id: TOKEN_ROW_ID,
      refreshToken: refresh,
    });
  }

  async disconnect(): Promise<void> {
    await this.tokenRepo.delete({ id: TOKEN_ROW_ID });
  }

  private async getAuthedClient() {
    const row = await this.tokenRepo.findOne({ where: { id: TOKEN_ROW_ID } });
    if (!row?.refreshToken) return null;
    const client = this.oauth2Client();
    client.setCredentials({ refresh_token: row.refreshToken });
    return client;
  }

  private eventBody(a: Agendamento) {
    const prefix = env('GOOGLE_CALENDAR_EVENT_PREFIX') || 'Funilaria';
    const lines: string[] = [
      `Status: ${statusLabel(a.status)}`,
      `Contato: ${a.contato}`,
    ];
    if (a.placa) lines.push(`Placa: ${a.placa}`);
    const veic = [a.marca, a.modelo, a.ano != null ? String(a.ano) : '']
      .filter(Boolean)
      .join(' ');
    if (veic) lines.push(`Veículo: ${veic}`);
    if (a.observacoes) lines.push('', a.observacoes);
    if (a.ordemId != null) lines.push('', `OS #${a.ordemId}`);
    lines.push('', `Agendamento sistema #${a.id}`);

    const summary =
      a.status === AgendamentoStatus.CANCELADO
        ? `[${prefix}] ${a.cliente} (cancelado)`
        : `[${prefix}] ${a.cliente}`;

    return {
      summary,
      description: lines.join('\n'),
      start: { date: a.dia },
      end: { date: addOneDayYmd(a.dia) },
    };
  }

  /** Cria evento na agenda e devolve o agendamento com googleEventId preenchido quando possível. */
  async syncOnCreate(a: Agendamento): Promise<Agendamento> {
    if (!a.id) return a;
    const auth = await this.getAuthedClient();
    if (!auth) return a;

    try {
      const cal = google.calendar({ version: 'v3', auth });
      const created = await cal.events.insert({
        calendarId: 'primary',
        requestBody: this.eventBody(a),
      });
      const eid = created.data.id;
      if (eid) {
        a.googleEventId = eid;
        return a;
      }
    } catch (e) {
      this.log.warn(`Google Calendar (create): ${formatGoogleApiError(e)}`);
    }
    return a;
  }

  async syncOnUpdate(a: Agendamento): Promise<void> {
    const auth = await this.getAuthedClient();
    if (!auth || !a.googleEventId) return;
    try {
      const cal = google.calendar({ version: 'v3', auth });
      await cal.events.patch({
        calendarId: 'primary',
        eventId: a.googleEventId,
        requestBody: this.eventBody(a),
      });
    } catch (e) {
      this.log.warn(`Google Calendar (update): ${formatGoogleApiError(e)}`);
    }
  }

  async syncOnDelete(googleEventId: string | null): Promise<void> {
    if (!googleEventId) return;
    const auth = await this.getAuthedClient();
    if (!auth) return;
    try {
      const cal = google.calendar({ version: 'v3', auth });
      await cal.events.delete({
        calendarId: 'primary',
        eventId: googleEventId,
      });
    } catch (e) {
      this.log.warn(`Google Calendar (delete): ${formatGoogleApiError(e)}`);
    }
  }
}
