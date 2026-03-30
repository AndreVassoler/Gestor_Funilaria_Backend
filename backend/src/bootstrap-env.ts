import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Carrega `backend/.env` de forma estável: `dotenv.config()` sem path usa só o
 * `process.cwd()`, então ao rodar o Nest a partir da raiz do monorepo o JWT e
 * o DATABASE_URL podem não aparecer (só 1 variável “estranha” no log).
 */
const backendRoot = join(__dirname, '..');
const envPath = join(backendRoot, '.env');

if (existsSync(envPath)) {
  config({ path: envPath });
} else {
  config();
}
