import './bootstrap-env';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';

const isProduction =
  process.env.NODE_ENV === 'production' ||
  Boolean(process.env.RAILWAY_ENVIRONMENT);

/**
 * Origens liberadas no CORS: apenas o painel (produção + dev),
 * em vez de refletir qualquer site que chamar a API.
 */
function buildAllowedOrigins(): string[] {
  const fromEnv = [
    process.env.FRONTEND_APP_URL,
    process.env.FRONTEND_APP_URL_LOCAL,
  ];
  const defaults = [
    // Domínio de produção do painel: garante o acesso mesmo se
    // FRONTEND_APP_URL não estiver definida nas variáveis do Railway.
    'https://app.funilariavassoler.com.br',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
  return [...fromEnv, ...defaults]
    .filter((u): u is string => Boolean(u && u.trim()))
    .map((u) => u.trim().replace(/\/$/, ''));
}

/** Em dev, o Vite/serve podem subir em outra porta se 3001 estiver ocupada. */
function isLocalDevOrigin(origin: string): boolean {
  if (isProduction) return false;
  try {
    const url = new URL(origin);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Atrás do proxy do Railway: necessário para o rate-limit enxergar o IP real.
  app.set('trust proxy', 1);

  // Headers de segurança (HSTS, no-sniff, anti-clickjacking, etc.).
  app.use(
    helmet({
      // A API entrega JSON/PDF/XLSX a um frontend hospedado em outro domínio.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const allowedOrigins = buildAllowedOrigins();
  app.enableCors({
    origin: (origin, callback) => {
      // Sem Origin = chamada server-to-server (curl, health check): liberar.
      const normalized = origin?.replace(/\/$/, '') ?? '';
      if (
        !origin ||
        allowedOrigins.includes(normalized) ||
        isLocalDevOrigin(normalized)
      ) {
        callback(null, true);
        return;
      }
      callback(new Error('Origem não autorizada pelo CORS.'), false);
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    exposedHeaders: ['Content-Disposition'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
