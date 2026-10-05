# Backup Manager

Plataforma de gerenciamento de backups para bancos de dados PostgreSQL, desenvolvida como projeto acadêmico da Aula 2.

O sistema permite criar, acompanhar, consultar e restaurar backups de bancos de dados PostgreSQL, além de realizar operações de manutenção, compactação, criptografia e controle do histórico de execuções.

---

## 📋 Sobre o projeto

O Backup Manager foi desenvolvido com o objetivo de fornecer uma plataforma para gerenciamento do processo de backup de bancos de dados PostgreSQL.

A aplicação possui uma API desenvolvida em Node.js e Express, uma interface web para gerenciamento das operações e um banco PostgreSQL responsável pelo armazenamento dos dados e registros de execução.

Entre as principais funcionalidades estão:

- Criação de backups PostgreSQL;
- Execução de backups em segundo plano;
- Acompanhamento do progresso das operações;
- Histórico de execuções;
- Registro detalhado de logs;
- Restauração de backups;
- Compressão de arquivos;
- Criptografia dos backups;
- Controle de retenção de backups;
- Cópia para destino secundário;
- Manutenção automática do banco de dados;
- Interface web para gerenciamento;
- Registro das informações das operações realizadas.

---

## 🛠️ Tecnologias utilizadas

### Backend

- Node.js
- Express
- PostgreSQL
- `pg`
- JavaScript
- `pg_dump`
- `pg_restore`
- 7-Zip

### Frontend

- HTML5
- CSS3
- JavaScript

### Banco de dados

- PostgreSQL

### Segurança

- AES para criptografia dos backups;
- Senha para compactação ZIP;
- Variáveis de ambiente para armazenamento das configurações sensíveis.

---

## 📁 Estrutura do projeto

```text
gerenciador-backup-bd/
│
├── backend/
│   ├── node_modules/
│   ├── .env
│   ├── .env.example
│   │
│   ├── backupJobService.js
│   ├── backupService.js
│   ├── database.js
│   ├── executableService.js
│   ├── fileService.js
│   ├── logService.js
│   ├── maintenanceService.js
│   ├── restoreService.js
│   ├── securityService.js
│   ├── server.js
│   │
│   ├── package.json
│   └── package-lock.json
│
├── backups/
│
├── database/
│   ├── 01_criar_tabelas.sql
│   ├── 02_alterar_historico_manutencao.sql
│   ├── 03_inserir_marcas.sql
│   ├── 04_inserir_veiculos.sql
│   ├── 05_dados_teste.sql
│   └── 06_historico_execucoes.sql
│
├── frontend/
│   ├── index.html
│   ├── script.js
│   └── style.css
│
├── .gitignore
├── README.md
└── Relatorio_Aula_2_grupo.docx