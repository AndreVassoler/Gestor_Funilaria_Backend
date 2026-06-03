# Gestor_Funilaria_Backend

API REST para gestão de **ordens de serviço** em funilaria: CRUD de OS, agendamentos, relatórios, exportação PDF/Excel e autenticação JWT.

O painel web fica no repositório separado **[Gestor_Funilaria_Frontend](https://github.com/AndreVassoler/Gestor_Funilaria_Frontend)**.

## Estrutura

| Pasta     | Descrição                         |
| --------- | --------------------------------- |
| `src/`    | NestJS + TypeORM + PostgreSQL     |
| `test/`   | Testes e2e                        |
## Tecnologias

- **NestJS 11**, TypeORM, PostgreSQL (`pg`)
- PDFKit / ExcelJS (relatórios e exportações)
- JWT

## Pré-requisitos

- [Node.js](https://nodejs.org/) (LTS recomendado)
- npm
- PostgreSQL (local, Docker ou [Supabase](https://supabase.com/))

## Desenvolvimento

```bash
npm install
cp .env.example .env   # preencha DATABASE_URL, JWT_SECRET, etc.
npm run start:dev
```

A API sobe em **http://localhost:3000** (ou na porta `PORT`).

- **Banco:** copie `.env.example` para `.env`. Com TLS (nuvem), não defina `DATABASE_SSL` ou deixe diferente de `false`. Postgres local sem SSL: `DATABASE_SSL=false`.
- **Painel local:** defina `FRONTEND_APP_URL_LOCAL` (ex.: `http://localhost:5173`) apontando para o app do repositório **Gestor_Funilaria_Frontend**.
### Variáveis de ambiente

Obrigatório: `DATABASE_URL`, `JWT_SECRET`. Veja `.env.example` para credenciais do painel e URL do front em produção (`FRONTEND_APP_URL`).

## Deploy no Railway

O repositório inclui `railway.json` (builder **RAILPACK**). O build usa `npm ci --include=dev && npm run build` porque, com `NODE_ENV=production` nas variáveis do serviço, um `npm ci` comum **não instala** `@nestjs/cli` / TypeScript e o passo `nest build` quebra em poucos segundos.

O backend usa `DATABASE_URL` (TypeORM). O host `postgres.railway.internal` **só resolve** quando o serviço **Postgres** está no **mesmo projeto** e as alterações do canvas foram aplicadas (botão **Apply changes** → **Deploy**).

### Checklist

1. **Postgres** no projeto (plugin PostgreSQL) e deploy do Postgres concluído (status verde, não só “New” pendente).
2. No serviço **Gestor_Funilaria** → **Variables**:
   - `DATABASE_URL` = referência do Postgres, ex.: `${{Postgres.DATABASE_URL}}` (nome do serviço deve bater com o card no canvas).
   - `JWT_SECRET` = segredo longo (obrigatório).
   - `NODE_ENV` = `production` (recomendado).
   - Demais variáveis do `.env.example` (`AUTH_USERNAME`, `AUTH_PASSWORD_HASH`, `FRONTEND_APP_URL`, etc.).
3. **Não** faça upload de `.env` no Railway; variáveis vêm do painel.
4. **Redeploy** do backend depois que o Postgres estiver ativo.

**Alternativa:** usar o mesmo `DATABASE_URL` do **Supabase** (como no `.env.example` local). Não é necessário Postgres no Railway nesse caso.

**Erro `getaddrinfo ENOTFOUND postgres.railway.internal`:** Postgres ainda não deployado, `DATABASE_URL` apontando para host interno sem serviço ligado, ou mudanças do canvas não aplicadas. Corrija o passo 1–2 e reinicie o backend.

**Plano Free (us-west2):** fora do horário de pico (8h–20h America/Los_Angeles) ou faça upgrade se o deploy for bloqueado.

### E-mail da agenda (Gmail / SMTP)

Com as variáveis de e-mail no Railway (e no `.env` local), a API envia:

| Evento | Quando |
|--------|--------|
| **Novo agendamento** | Na hora, ao salvar no painel |
| **Resumo do dia** | 07:00 (Brasília), se houver agendamentos hoje (cancelados não entram) |

Variáveis no serviço **Gestor_Funilaria** → **Variables** (veja `.env.example`):

- `NOTIFY_EMAIL_TO`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `NOTIFY_EMAIL_FROM` (opcional)
- `NOTIFY_CRON_SECRET` — mesma string no secret **GitHub** `NOTIFY_CRON_SECRET` (dispara o resumo das 07:00 com o app em sleep)
- `FRONTEND_APP_URL` — link “Abrir agenda” nos e-mails

**Gmail:** ative verificação em 2 etapas e use **Senha de app** em `SMTP_PASS` (não a senha normal da conta).

**Testar aviso imediato:** cadastre um agendamento no painel e confira a caixa de entrada (e spam).

**Testar resumo:** GitHub → **Actions** → **Keep Alive** → **Run workflow** (job `agenda-email`) ou, após deploy:

```bash
curl -X POST "https://SUA-API.up.railway.app/notifications/cron/agenda-resumo" \
  -H "X-Notify-Cron-Secret: SEU_NOTIFY_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d "{}"
```

## Keep alive (Supabase + Railway)

O projeto pode **hibernar** no Supabase (inatividade) e no Railway (`sleepApplication: true` em `railway.json`). O workflow [`.github/workflows/keep_alive.yml`](.github/workflows/keep_alive.yml) envia pings automáticos:

| Alvo | Frequência | O que faz |
|------|------------|-----------|
| **Supabase** | 09:00 UTC, diário | `POST` na RPC `keepalive` |
| **Railway (API)** | A cada 14 min | `GET /health` (rota pública) |
| **Resumo agenda (e-mail)** | 10:00 UTC (07:00 Brasília) | `POST /notifications/cron/agenda-resumo` |

### Checklist no GitHub

Repositório **Gestor_Funilaria_Backend** → **Settings** → **Secrets and variables** → **Actions**:

| Secret | Exemplo |
|--------|---------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | service role (Settings → API) |
| `API_PUBLIC_URL` | `https://gestorfunilaria-production.up.railway.app` |
| `NOTIFY_CRON_SECRET` | mesma string que `NOTIFY_CRON_SECRET` no Railway |

Opcional: `SUPABASE_KEEPALIVE_RPC` se a função SQL tiver outro nome.

### Função SQL no Supabase (uma vez)

No **SQL Editor**, execute a migration [`supabase/migrations/20260603115744_keepalive_rpc.sql`](supabase/migrations/20260603115744_keepalive_rpc.sql) ou rode o conteúdo dela manualmente.

Depois de `commit` + `push` do workflow: **Actions** → **Keep Alive (Supabase + Railway)** → **Run workflow** para testar. No log, confira `Keep alive Supabase OK` e `Keep alive Railway OK`.

## CI (GitHub Actions)

No push ou pull request para `main`, o workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) sobe PostgreSQL 16, define `DATABASE_SSL=false` e roda `build`, `test` e `test:e2e` na raiz do repositório.

## Scripts úteis

- `npm run start:dev` — API com reload
- `npm run build` — compila para `dist/`
- `npm run start:prod` — executa `dist/main` (após `build`)
- `npm run test` — testes unitários
- `npm run test:e2e` — testes e2e (exige `DATABASE_URL` com PostgreSQL acessível)

## API

Prefixo principal: **`/ordens-servico`** (CRUD, resumo, exportações). Autenticação em `/auth/login`.

## Repositórios

| Repositório | Função |
| ----------- | ------ |
| [Gestor_Funilaria_Backend](https://github.com/AndreVassoler/Gestor_Funilaria_Backend) | Esta API |
| [Gestor_Funilaria_Frontend](https://github.com/AndreVassoler/Gestor_Funilaria_Frontend) | Painel React (Vite) |

## Licença

Pacote privado (`package.json`). Ajuste conforme o uso do projeto.
