const PECAS_REPARO_OPCOES = [
  'Parachoque dianteiro',
  'Parachoque traseiro',
  'Capô',
  'Porta dianteira esquerda',
  'Porta dianteira direita',
  'Porta traseira esquerda',
  'Porta traseira direita',
  'Paralama esquerdo',
  'Paralama direito',
  'Teto',
  'Tampa traseira',
  'Lateral traseira esquerda',
  'Lateral traseira direita',
  'Outro',
] as const;

const PECAS_VALIDAS = new Set<string>(PECAS_REPARO_OPCOES);

export function precoUnitarioPecaReparo(peca: string): number {
  switch (peca) {
    case 'Parachoque dianteiro':
    case 'Parachoque traseiro':
      return 150;
    case 'Capô':
    case 'Teto':
      return 350;
    default:
      return 250;
  }
}

export function parsePecasReparoString(pecasReparo: string): string[] {
  return pecasReparo
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
}

export function calcularValorTotalPecas(pecas: readonly string[]): number {
  return pecas.reduce((s, p) => s + precoUnitarioPecaReparo(p), 0);
}

export function validarPecasReparoParaCotacao(pecasReparo: string | undefined): string[] {
  const pecas = parsePecasReparoString(pecasReparo ?? '');
  if (pecas.length === 0) {
    throw new Error('PEÇAS_OBRIGATÓRIAS');
  }
  const invalidas = pecas.filter((p) => !PECAS_VALIDAS.has(p));
  if (invalidas.length > 0) {
    throw new Error('PEÇAS_INVALIDAS');
  }
  return pecas;
}
