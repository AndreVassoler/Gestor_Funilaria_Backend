import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Carrega `.env` na raiz do projeto de forma estável: `dotenv.config()` sem path
 * usa só o `process.cwd()`, então JWT e DATABASE_URL podem não aparecer no log.
 */
const projectRoot = join(__dirname, '..');
const envPath = join(projectRoot, '.env');

if (existsSync(envPath)) {
  config({ path: envPath });
} else {
  config();
}
