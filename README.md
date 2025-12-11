<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

Backend da aplicação FlamaAI construído com [NestJS](https://github.com/nestjs/nest) e [Better Auth](https://www.better-auth.com/) para autenticação.

## Tecnologias

- **NestJS** - Framework Node.js progressivo
- **Better Auth** - Sistema de autenticação moderno
- **PostgreSQL** - Banco de dados relacional
- **Drizzle ORM** - ORM TypeScript-first para SQL
- **TypeScript** - Superset tipado do JavaScript

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- Node.js (v18 ou superior)
- pnpm
- PostgreSQL (rodando localmente ou uma instância remota)

## Configuração

1. Clone o repositório
2. Instale as dependências:

```bash
$ pnpm install
```

3. Crie um arquivo `.env` na raiz do projeto:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/flamaai

# Application
BASE_URL=http://localhost:3000
NODE_ENV=development

# Gov.br OAuth (ver GOVBR_SETUP.md para mais detalhes)
GOVBR_CLIENT_ID=seu_client_id_aqui
GOVBR_CLIENT_SECRET=seu_client_secret_aqui
```

4. Certifique-se de que o PostgreSQL está rodando:

```bash
# macOS (com Homebrew)
$ brew services start postgresql

# Linux
$ sudo systemctl start postgresql

# Windows
# Use o pgAdmin ou inicie o serviço PostgreSQL
```

5. Execute as migrations do banco de dados:

```bash
$ pnpm run db:push
```

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
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

### Login Social (Gov.br)
```bash
GET /api/auth/sign-in/social?provider=govbr
```

**Fluxo completo:**
1. O frontend redireciona o usuário para `/api/auth/sign-in/social?provider=govbr`
2. O backend redireciona para a página de login do Gov.br
3. O usuário faz login no Gov.br
4. O Gov.br redireciona de volta para `http://localhost:3000/api/auth/callback/govbr`
5. O backend processa o callback e cria a sessão com os dados do usuário
6. O backend redireciona o usuário para o frontend

**Campos extras do Gov.br:**
- CPF do usuário
- Nível de confiabilidade (gold, silver, bronze)
- Selos de confiabilidade (array)

Para mais detalhes sobre a configuração do Gov.br, consulte o arquivo [GOVBR_SETUP.md](./GOVBR_SETUP.md).

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
