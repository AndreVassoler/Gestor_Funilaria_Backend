import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { OrdemServico } from './ordem-servico.entity';

export type FotoTipo = 'antes' | 'depois';

@Entity('ordens_servico_fotos')
export class OrdemServicoFoto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ordemId: number;

  @ManyToOne(() => OrdemServico, (o) => o.fotos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ordemId' })
  ordem: OrdemServico;

  @Column({ type: 'varchar', length: 10 })
  tipo: FotoTipo;

  /** Caminho relativo a partir da pasta uploads (ex.: ordens/1/arquivo.jpg) */
  @Column({ type: 'varchar', length: 500 })
  arquivo: string;
}
