import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { OrdemServicoFoto } from './ordem-servico-foto.entity';

export enum OrdemServicoStatus {
  ABERTO = 'aberto',
  FAZENDO = 'fazendo',
  PRONTO = 'pronto',
}

@Entity('ordens_servico')
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

  @Column({ type: 'int' })
  ano: number;

  @Column({ type: 'varchar', length: 20 })
  placa: string;

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

  @OneToMany(() => OrdemServicoFoto, (f) => f.ordem)
  fotos: OrdemServicoFoto[];
}
