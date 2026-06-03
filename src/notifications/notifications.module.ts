import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agendamento } from '../agendamentos/agendamento.entity';
import { AgendaEmailScheduler } from './agenda-email.scheduler';
import { AgendaEmailService } from './agenda-email.service';
import { EmailService } from './email.service';
import { NotificationsCronController } from './notifications-cron.controller';
import { NotifyCronGuard } from './notify-cron.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Agendamento])],
  controllers: [NotificationsCronController],
  providers: [
    EmailService,
    AgendaEmailService,
    AgendaEmailScheduler,
    NotifyCronGuard,
  ],
  exports: [EmailService, AgendaEmailService],
})
export class NotificationsModule {}
