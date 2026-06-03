import './bootstrap-env';

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agendamento } from './agendamentos/agendamento.entity';
import { AgendamentosModule } from './agendamentos/agendamentos.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { OrdemServico } from './ordens-servico/ordem-servico.entity';
import { OrdensServicoModule } from './ordens-servico/ordens-servico.module';
import { RootController } from './root.controller';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'Defina DATABASE_URL com a URI do PostgreSQL (veja .env.example).',
  );
}

/**
 * Supabase e a maioria dos hosts em nuvem exigem TLS.
 * Postgres local ou rede privada Railway (`.railway.internal`) não usam SSL.
 */
const isRailwayPrivateNetwork = databaseUrl.includes('.railway.internal');
const useSsl =
  process.env.DATABASE_SSL !== 'false' && !isRailwayPrivateNetwork;

/**
 * Em produção o schema NÃO deve ser alterado automaticamente: `synchronize: true`
 * pode dropar colunas e perder dados num deploy. Liga só fora de produção.
 * Mudanças de schema em produção devem ir por migrations do TypeORM.
 */
const isProduction =
  process.env.NODE_ENV === 'production' ||
  Boolean(process.env.RAILWAY_ENVIRONMENT);

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: databaseUrl,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      entities: [OrdemServico, Agendamento],
      synchronize: !isProduction,
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
