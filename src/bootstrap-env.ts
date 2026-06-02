import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Carrega `.env` na raiz do projeto de forma estável: `dotenv.config()` sem path
 * usa só o `process.cwd()`, então JWT e DATABASE_URL podem não aparecer no log.
 *
 * Em produção (Railway, etc.) não lê arquivo `.env`: use só variáveis do painel.
 */
const projectRoot = join(__dirname, '..');
const envPath = join(projectRoot, '.env');

const isProduction =
  process.env.NODE_ENV === 'production' ||
  Boolean(process.env.RAILWAY_ENVIRONMENT);

if (isProduction) {
  // Variáveis já vêm do Railway / plataforma.
} else if (existsSync(envPath)) {
  config({ path: envPath });
} else {
  config();
}
