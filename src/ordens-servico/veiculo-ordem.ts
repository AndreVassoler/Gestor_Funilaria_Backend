import { BadRequestException } from '@nestjs/common';

export const VEICULO_NAO_APLICAVEL = 'Não aplicável';

export type VeiculoOrdemNormalizado = {
  ano: number | null;
  placa: string;
  implementoAgricola: boolean;
  marca?: string;
  modelo?: string;
};

export function validarVeiculoOrdem(input: {
  ano?: number | null;
  placa?: string;
  implementoAgricola?: boolean;
}): VeiculoOrdemNormalizado {
  const implementoAgricola = input.implementoAgricola === true;
  const anoMax = new Date().getFullYear() + 1;

  let ano: number | null = null;
  if (input.ano != null && input.ano !== undefined) {
    const n = Number(input.ano);
    if (Number.isNaN(n) || n < 1900 || n > anoMax) {
      throw new BadRequestException(
        `Informe um ano válido (1900 a ${anoMax}) ou deixe em branco.`,
      );
    }
    ano = n;
  }

  if (implementoAgricola) {
    return {
      ano,
      placa: '',
      implementoAgricola: true,
      marca: VEICULO_NAO_APLICAVEL,
      modelo: VEICULO_NAO_APLICAVEL,
    };
  }

  const placa = (input.placa ?? '').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (!placa) {
    throw new BadRequestException(
      'Informe a placa ou ative Implemento Agrícola.',
    );
  }
  const placaAntigo = /^[A-Z]{3}\d{4}$/.test(placa);
  const placaMercosul = /^[A-Z]{3}\d[A-Z]\d{2}$/.test(placa);
  if (placa.length !== 7 || (!placaAntigo && !placaMercosul)) {
    throw new BadRequestException(
      'Placa inválida: modelo antigo (ex.: ABC1234) ou Mercosul (ex.: ABC1D23).',
    );
  }

  return { ano, placa, implementoAgricola: false };
}
