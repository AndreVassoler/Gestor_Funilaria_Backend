export enum TipoServico {
  FUNILARIA = 'funilaria',
  ELETRICA = 'eletrica',
}

export const TIPOS_SERVICO = Object.values(TipoServico);

export function labelTipoServico(tipo: TipoServico): string {
  switch (tipo) {
    case TipoServico.FUNILARIA:
      return 'Funilaria';
    case TipoServico.ELETRICA:
      return 'Elétrica automotiva';
    default:
      return tipo;
  }
}

export function labelItensChecklist(tipo: TipoServico): string {
  return tipo === TipoServico.FUNILARIA
    ? 'Local do reparo'
    : 'Serviços / sistemas';
}
