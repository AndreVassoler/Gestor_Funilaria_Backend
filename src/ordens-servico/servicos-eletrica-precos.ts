const SERVICOS_ELETRICA_OPCOES = [
  'Diagnóstico elétrico',
  'Bateria',
  'Alternador',
  'Motor de partida',
  'Chicote / fiação',
  'Faróis / lanternas',
  'Vidro elétrico',
  'Trava elétrica',
  'Ar condicionado (elétrica)',
  'Central / módulo',
  'Outro',
] as const;

const SERVICOS_VALIDOS = new Set<string>(SERVICOS_ELETRICA_OPCOES);

export function precoUnitarioServicoEletrica(servico: string): number {
  switch (servico) {
    case 'Diagnóstico elétrico':
      return 80;
    case 'Bateria':
      return 60;
    case 'Alternador':
    case 'Motor de partida':
      return 120;
    case 'Chicote / fiação':
    case 'Ar condicionado (elétrica)':
      return 150;
    case 'Central / módulo':
      return 200;
    case 'Faróis / lanternas':
    case 'Trava elétrica':
      return 80;
    case 'Vidro elétrico':
      return 100;
    default:
      return 100;
  }
}

export function parseItensChecklistString(itensChecklist: string): string[] {
  return itensChecklist
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
}

export function calcularValorTotalServicosEletrica(
  servicos: readonly string[],
): number {
  return servicos.reduce((s, p) => s + precoUnitarioServicoEletrica(p), 0);
}

export function validarServicosEletricaParaCotacao(
  itensChecklist: string | undefined,
): string[] {
  const servicos = parseItensChecklistString(itensChecklist ?? '');
  if (servicos.length === 0) {
    throw new Error('ITENS_OBRIGATORIOS');
  }
  const invalidos = servicos.filter((s) => !SERVICOS_VALIDOS.has(s));
  if (invalidos.length > 0) {
    throw new Error('ITENS_INVALIDOS');
  }
  return servicos;
}
