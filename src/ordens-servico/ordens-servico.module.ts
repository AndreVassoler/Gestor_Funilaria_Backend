import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdemFotoService } from './ordem-foto.service';
import { OrdemServicoFoto } from './ordem-servico-foto.entity';
import { OrdemServico } from './ordem-servico.entity';
import { OrdensPdfService } from './ordens-pdf.service';
import { OrdensServicoController } from './ordens-servico.controller';
import { OrdensServicoService } from './ordens-servico.service';

@Module({
  imports: [TypeOrmModule.forFeature([OrdemServico, OrdemServicoFoto])],
  controllers: [OrdensServicoController],
  providers: [OrdensServicoService, OrdemFotoService, OrdensPdfService],
})
export class OrdensServicoModule {}
