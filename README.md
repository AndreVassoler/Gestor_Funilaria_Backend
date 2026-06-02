# Gestor_Funilaria_Backend

API REST para gestão de **ordens de serviço** em funilaria: CRUD de OS, fotos, agendamentos, relatórios, exportação PDF/Excel, autenticação JWT e integração com Google Calendar.

O painel web fica no repositório separado **[Gestor_Funilaria_Frontend](https://github.com/AndreVassoler/Gestor_Funilaria_Frontend)**.

## Estrutura

| Pasta     | Descrição                         |
| --------- | --------------------------------- |
| `src/`    | NestJS + TypeORM + PostgreSQL     |
| `test/`   | Testes e2e                        |
| `uploads/`| Fotos das ordens de serviço       |

## Tecnologias

- **NestJS 11**, TypeORM, PostgreSQL (`pg`)
- Multer (upload de fotos), PDFKit / ExcelJS (relatórios e exportações)
- JWT, Google Calendar (opcional)

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
- Fotos: servidas em `/uploads/` a partir de `uploads/` (ignorado pelo Git, exceto `.gitkeep`).

### Variáveis de ambiente

Obrigatório: `DATABASE_URL`, `JWT_SECRET`. Veja `.env.example` para OAuth Google, credenciais do painel e URL do front em produção (`FRONTEND_APP_URL`).

## Deploy no Railway

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

## CI (GitHub Actions)

No push ou pull request para `main`, o workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) sobe PostgreSQL 16, define `DATABASE_SSL=false` e roda `build`, `test` e `test:e2e` na raiz do repositório.

## Scripts úteis

- `npm run start:dev` — API com reload
- `npm run build` — compila para `dist/`
- `npm run start:prod` — executa `dist/main` (após `build`)
- `npm run test` — testes unitários
- `npm run test:e2e` — testes e2e (exige `DATABASE_URL` com PostgreSQL acessível)

## API

Prefixo principal: **`/ordens-servico`** (CRUD, resumo, fotos, exportações). Autenticação em `/auth/login`.

## Repositórios

| Repositório | Função |
| ----------- | ------ |
| [Gestor_Funilaria_Backend](https://github.com/AndreVassoler/Gestor_Funilaria_Backend) | Esta API |
| [Gestor_Funilaria_Frontend](https://github.com/AndreVassoler/Gestor_Funilaria_Frontend) | Painel React (Vite) |

## Licença

Pacote privado (`package.json`). Ajuste conforme o uso do projeto.
