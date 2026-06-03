import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agendamento } from '../agendamentos/agendamento.entity';
import { AgendaEmailScheduler } from './agenda-email.scheduler';
import { AgendaEmailService } from './agenda-email.service';
import { EmailService } from './email.service';

@Module({
  imports: [TypeOrmModule.forFeature([Agendamento])],
  providers: [EmailService, AgendaEmailService, AgendaEmailScheduler],
  exports: [EmailService, AgendaEmailService],
})
export class NotificationsModule {}
