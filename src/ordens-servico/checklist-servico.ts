import { TipoServico } from '../tipo-servico';
import { validarPecasReparoParaCotacao } from './pecas-reparo-precos';
import { validarServicosEletricaParaCotacao } from './servicos-eletrica-precos';

export function validarItensChecklistParaCotacao(
  tipoServico: TipoServico,
  itensChecklist: string | undefined,
): string[] {
  if (tipoServico === TipoServico.ELETRICA) {
    return validarServicosEletricaParaCotacao(itensChecklist);
  }
  return validarPecasReparoParaCotacao(itensChecklist);
}

export function mensagemErroItensChecklist(code: string): string | null {
  if (code === 'PEÇAS_OBRIGATÓRIAS' || code === 'ITENS_OBRIGATORIOS') {
    return 'Selecione ao menos um item do checklist para cotar o serviço.';
  }
  if (code === 'PEÇAS_INVALIDAS' || code === 'ITENS_INVALIDOS') {
    return 'Item inválido no checklist da cotação.';
  }
  return null;
}
