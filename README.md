# FlamaAI API

Backend da aplicação FlamaAI para análise de risco de fogo.

## Tecnologias

- **NestJS** - Framework Node.js progressivo
- **Better Auth** - Sistema de autenticação moderno
- **PostgreSQL** - Banco de dados relacional
- **PostGIS** - Extensão geoespacial do PostgreSQL
- **Drizzle ORM** - ORM TypeScript moderno
- **TypeScript** - Superset tipado do JavaScript

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- Node.js (v18 ou superior)
- pnpm
- PostgreSQL com extensão PostGIS

## Configuração

1. Clone o repositório
2. Instale as dependências:

```bash
pnpm install
```

3. Crie um arquivo `.env` na raiz do projeto:

```bash
DATABASE_URL=postgresql://usuario:senha@localhost:5432/flamaai
PORT=3000
```

4. Certifique-se de que o PostgreSQL está rodando e que a extensão PostGIS está instalada:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

5. Execute as migrações do banco de dados:

```bash
pnpm run db:migrate
```

## Executar o projeto

```bash
# desenvolvimento
pnpm run start:dev

# produção
pnpm run start:prod
```

## Comandos do Banco de Dados

```bash
# Gerar migrações
pnpm run db:generate

# Aplicar migrações
pnpm run db:migrate

# Push do schema (desenvolvimento)
pnpm run db:push

# Abrir Drizzle Studio
pnpm run db:studio
```

## API de Autenticação

O backend utiliza Better Auth com as seguintes rotas:

### Registro
```bash
POST /api/auth/sign-up/email
Content-Type: application/json

{
  "email": "usuario@exemplo.com",
  "password": "senha123",
  "name": "Nome do Usuário"
}
```

### Login
```bash
POST /api/auth/sign-in/email
Content-Type: application/json

{
  "email": "usuario@exemplo.com",
  "password": "senha123"
}
```

### Logout
```bash
POST /api/auth/sign-out
```

### Obter Sessão
```bash
GET /api/auth/get-session
```

## Módulos da API

- **Auth** - Autenticação e autorização
- **Weather** - Dados meteorológicos
- **Geocoding** - Geocodificação e localização
- **Fire Risk** - Análise de risco de fogo
- **Map** - Visualização em mapas

## Testes

```bash
# testes unitários
pnpm run test

# testes e2e
pnpm run test:e2e

# cobertura de testes
pnpm run test:cov
```
