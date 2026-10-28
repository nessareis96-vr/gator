# gator 🐊

Agregador de feeds RSS desenvolvido em TypeScript, com armazenamento em PostgreSQL e consultas usando Drizzle ORM.

O gator permite cadastrar usuários, adicionar feeds, seguir feeds cadastrados por outras pessoas e consultar publicações pelo terminal.

## Funcionalidades

- Cadastro e seleção do usuário atual.
- Cadastro de feeds com URLs únicas.
- Acompanhamento de feeds por diferentes usuários.
- Coleta periódica de publicações RSS.
- Armazenamento de posts sem duplicar URLs.
- Consulta dos posts dos feeds seguidos, ordenados pela data de publicação.
- Exclusão dos dados para facilitar testes de desenvolvimento.

## Tecnologias

- TypeScript
- Node.js
- PostgreSQL
- Drizzle ORM e Drizzle Kit
- Postgres.js
- fast-xml-parser
- tsx

## Pré-requisitos

- Git.
- Node.js 22.15.0 e npm.
- PostgreSQL 16 ou superior, instalado e em execução.
- NVM, recomendado para usar a versão do Node definida em `.nvmrc`.
- No Windows, utilize WSL 2 para acompanhar o ambiente de desenvolvimento do projeto.

## Sobre o projeto

Projeto de estudo desenvolvido durante o curso de desenvolvimento back-end do Boot.dev, praticando TypeScript, SQL, PostgreSQL, migrações, relacionamentos e operações assíncronas.