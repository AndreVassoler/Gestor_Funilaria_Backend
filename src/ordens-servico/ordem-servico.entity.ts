import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { TipoServico } from '../tipo-servico';

export enum OrdemServicoStatus {
  ABERTO = 'aberto',
  FAZENDO = 'fazendo',
  PRONTO = 'pronto',
}

@Entity('ordens_servico')
@Index(['status'])
@Index(['previsaoEntrega'])
@Index(['tipoServico'])
export class OrdemServico {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  cliente: string;

  @Column({ type: 'varchar', length: 255 })
  contato: string;

  @Column({ type: 'varchar', length: 255 })
  marca: string;

  @Column({ type: 'varchar', length: 255 })
  modelo: string;

  @Column({ type: 'int', nullable: true })
  ano: number | null;

  @Column({ type: 'varchar', length: 20, default: '' })
  placa: string;

  /** Trator/implemento sem placa — dispensa ano e placa no cadastro. */
  @Column({ type: 'boolean', default: false })
  implementoAgricola: boolean;

  @Column({
    type: 'varchar',
    length: 20,
    default: TipoServico.FUNILARIA,
  })
  tipoServico: TipoServico;

  /** Itens do checklist (peças de lataria ou serviços elétricos), separados por vírgula. */
  @Column({ type: 'text', nullable: true })
  itensChecklist: string | null;

  @Column({ type: 'text' })
  descricao: string;

  @Column({ type: 'real' })
  valor: number;

  @Column({ type: 'timestamptz', nullable: true })
  dataAbertura: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  previsaoEntrega: Date | null;

  /** Preenchida ao marcar OS como pronta; base para receita por período no relatório fiscal. */
  @Column({ type: 'timestamptz', nullable: true })
  dataConclusao: Date | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: OrdemServicoStatus.ABERTO,
  })
  status: OrdemServicoStatus;
}
