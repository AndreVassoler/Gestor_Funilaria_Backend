import './bootstrap-env';

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agendamento } from './agendamentos/agendamento.entity';
import { AgendamentosModule } from './agendamentos/agendamentos.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { GoogleCalendarToken } from './google-calendar/google-calendar-token.entity';
import { OrdemServicoFoto } from './ordens-servico/ordem-servico-foto.entity';
import { OrdemServico } from './ordens-servico/ordem-servico.entity';
import { OrdensServicoModule } from './ordens-servico/ordens-servico.module';
import { RootController } from './root.controller';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'Defina DATABASE_URL com a URI do PostgreSQL (veja backend/.env.example).',
  );
}

/** Supabase e a maioria dos hosts em nuvem exigem TLS; desligue só em Postgres local sem SSL. */
const useSsl = process.env.DATABASE_SSL !== 'false';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: databaseUrl,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      entities: [
        OrdemServico,
        OrdemServicoFoto,
        Agendamento,
        GoogleCalendarToken,
      ],
      synchronize: true,
      retryAttempts: 3,
      retryDelay: 3000,
    }),
    AuthModule,
    OrdensServicoModule,
    AgendamentosModule,
  ],
  controllers: [RootController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
