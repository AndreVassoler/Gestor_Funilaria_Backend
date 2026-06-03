import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { Agendamento } from './agendamento.entity';
import { AgendamentosController } from './agendamentos.controller';
import { AgendamentosService } from './agendamentos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Agendamento]), NotificationsModule],
  controllers: [AgendamentosController],
  providers: [AgendamentosService],
})
export class AgendamentosModule {}
