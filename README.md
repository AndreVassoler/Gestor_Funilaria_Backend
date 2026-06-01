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
