import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdemServico } from './ordem-servico.entity';
import { OrdensPdfService } from './ordens-pdf.service';
import { OrdensServicoController } from './ordens-servico.controller';
import { OrdensServicoService } from './ordens-servico.service';

@Module({
  imports: [TypeOrmModule.forFeature([OrdemServico])],
  controllers: [OrdensServicoController],
  providers: [OrdensServicoService, OrdensPdfService],
})
export class OrdensServicoModule {}
