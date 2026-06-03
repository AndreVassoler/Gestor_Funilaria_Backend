import { FUNILARIA_NOME } from '../brand';
import {
  Agendamento,
  AgendamentoStatus,
} from '../agendamentos/agendamento.entity';

const STATUS_LABEL: Record<AgendamentoStatus, string> = {
  [AgendamentoStatus.AGENDADO]: 'Agendado',
  [AgendamentoStatus.CONFIRMADO]: 'Confirmado',
  [AgendamentoStatus.CANCELADO]: 'Cancelado',
  [AgendamentoStatus.FINALIZADO]: 'Finalizado',
};

export function hojeYmdBr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function formatarDiaBr(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
  return dt.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function veiculoLinha(a: Agendamento): string {
  const parts: string[] = [];
  if (a.marca?.trim() || a.modelo?.trim()) {
    parts.push(`${a.marca?.trim() ?? ''} ${a.modelo?.trim() ?? ''}`.trim());
  }
  if (a.ano != null) parts.push(String(a.ano));
  if (a.placa?.trim()) parts.push(`placa ${a.placa.trim()}`);
  return parts.length ? parts.join(' · ') : '—';
}

export function formatarAgendamentoTexto(a: Agendamento): string {
  const linhas = [
    `#${a.id} · ${a.cliente}`,
    `  Data: ${formatarDiaBr(a.dia)}`,
    `  Contato: ${a.contato}`,
    `  Veículo: ${veiculoLinha(a)}`,
    `  Status: ${STATUS_LABEL[a.status] ?? a.status}`,
  ];
  if (a.observacoes?.trim()) {
    linhas.push(`  Obs.: ${a.observacoes.trim()}`);
  }
  return linhas.join('\n');
}

export function formatarAgendamentoHtml(a: Agendamento): string {
  const obs = a.observacoes?.trim()
    ? `<p style="margin:4px 0 0;color:#555"><strong>Obs.:</strong> ${escapeHtml(a.observacoes.trim())}</p>`
    : '';

  return `
    <div style="margin:0 0 12px;padding:12px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc">
      <p style="margin:0 0 6px;font-weight:600">#${a.id} · ${escapeHtml(a.cliente)}</p>
      <p style="margin:0 0 4px"><strong>Data:</strong> ${escapeHtml(formatarDiaBr(a.dia))}</p>
      <p style="margin:0 0 4px"><strong>Contato:</strong> ${escapeHtml(a.contato)}</p>
      <p style="margin:0 0 4px"><strong>Veículo:</strong> ${escapeHtml(veiculoLinha(a))}</p>
      <p style="margin:0"><strong>Status:</strong> ${escapeHtml(STATUS_LABEL[a.status] ?? a.status)}</p>
      ${obs}
    </div>
  `.trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Link do painel (/agenda) em produção. */
export function painelAgendaUrl(): string | null {
  const raw = process.env.FRONTEND_APP_URL?.trim();
  if (!raw) return null;
  const base = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return `${base.replace(/\/$/, '')}/agenda`;
}

export function wrapEmailHtml(title: string, bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<body style="font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#0f1419;line-height:1.5;margin:0;padding:24px;background:#f0f2f6">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #e2e8f0">
    <p style="margin:0 0 4px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.04em">${escapeHtml(FUNILARIA_NOME)}</p>
    <h1 style="margin:0 0 16px;font-size:20px;color:#1a6b45">${escapeHtml(title)}</h1>
    ${bodyHtml}
    <p style="margin:24px 0 0;font-size:12px;color:#94a3b8">Gestor Funilaria — aviso automático da agenda.</p>
  </div>
</body>
</html>
  `.trim();
}
