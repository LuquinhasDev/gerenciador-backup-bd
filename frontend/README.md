# Plataforma de Gerenciamento de Backup

Projeto desenvolvido para a disciplina de Banco de Dados.

A aplicação tem como objetivo fornecer uma plataforma para configuração
e gerenciamento do processo de backup de um banco de dados PostgreSQL.

## Domínio

Gestão de veículos.

O banco simula dados de uma concessionária/locadora de veículos.

## Tecnologias

- HTML
- CSS
- JavaScript
- Node.js
- Express
- PostgreSQL
- pgAdmin

## Estrutura do banco

O banco possui as seguintes tabelas:

- marcas
- veiculos
- historico_manutencao

## Como executar

### 1. Criar o banco

Criar no PostgreSQL um banco chamado:

gestao_veiculos

### 2. Criar as tabelas

Executar:

database/01_create_tables.sql

### 3. Inserir os dados

Executar:

database/02_insert_data.sql

### 4. Instalar as dependências

Entrar na pasta backend:

```bash
cd backend