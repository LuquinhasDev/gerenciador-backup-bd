# Plataforma de Gerenciamento de Backup

Projeto desenvolvido para a disciplina de Banco de Dados.

A plataforma tem como objetivo fornecer uma interface para configuração
e gerenciamento de processos de backup de um banco de dados PostgreSQL.

## Domínio

Gestão de veículos.

O sistema utiliza um banco de dados PostgreSQL contendo informações
relacionadas a marcas, veículos e histórico de manutenção.

## Tecnologias utilizadas

- HTML
- CSS
- JavaScript
- Node.js
- Express
- PostgreSQL
- pgAdmin

## Estrutura do projeto

```text
plataforma-backup/
│
├── backend/
│   ├── server.js
│   ├── database.js
│   ├── .env.example
│   ├── package.json
│   └── package-lock.json
│
├── database/
│   ├── 01_create_tables.sql
│   └── 02_insert_data.sql
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── .gitignore
└── README.md