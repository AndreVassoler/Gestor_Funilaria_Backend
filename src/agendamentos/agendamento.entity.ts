import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum AgendamentoStatus {
  AGENDADO = 'agendado',
  CONFIRMADO = 'confirmado',
  CANCELADO = 'cancelado',
  FINALIZADO = 'finalizado',
}

@Entity('agendamentos')
export class Agendamento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  cliente: string;

  @Column({ type: 'varchar', length: 255 })
  contato: string;

  @Column({ type: 'varchar', length: 20, default: '' })
  placa: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  marca: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  modelo: string;

  @Column({ type: 'int', nullable: true })
  ano: number | null;

  /** Dia do agendamento (AAAA-MM-DD, fuso local ao cadastrar). */
  @Column({ type: 'varchar', length: 10 })
  dia: string;

  @Column({ type: 'text', default: '' })
  observacoes: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: AgendamentoStatus.AGENDADO,
  })
  status: AgendamentoStatus;

  /** Preenchido quando a OS é aberta a partir deste agendamento */
  @Column({ type: 'int', nullable: true })
  ordemId: number | null;

  /** ID do evento no Google Agenda (API), quando sincronizado */
  @Column({ type: 'varchar', length: 255, nullable: true })
  googleEventId: string | null;
}
