-- ============================================================
-- BANCO DE DADOS - GERENCIADOR DE BACKUPS
-- ============================================================


-- ============================================================
-- 01. TABELA DE MARCAS
-- ============================================================

CREATE TABLE IF NOT EXISTS marcas (
    id_marca SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    pais VARCHAR(100) NOT NULL
);


-- ============================================================
-- 02. TABELA DE VEÍCULOS
-- ============================================================

CREATE TABLE IF NOT EXISTS veiculos (
    id_veiculo SERIAL PRIMARY KEY,

    id_marca INTEGER NOT NULL,

    modelo VARCHAR(100) NOT NULL,

    placa VARCHAR(10) NOT NULL,

    valor NUMERIC(12, 2) NOT NULL,

    CONSTRAINT fk_veiculo_marca
        FOREIGN KEY (id_marca)
        REFERENCES marcas(id_marca)
);


-- ============================================================
-- 03. TABELA DE HISTÓRICO DE MANUTENÇÃO
-- ============================================================

CREATE TABLE IF NOT EXISTS historico_manutencao (
    id SERIAL PRIMARY KEY,

    data_hora TIMESTAMP,

    regra_aplicada VARCHAR(255),

    duracao INTERVAL,

    status VARCHAR(50),

    tipo_operacao VARCHAR(30) DEFAULT 'MANUTENCAO',

    data_inicio TIMESTAMP,

    data_fim TIMESTAMP,

    mensagem TEXT,

    banco_dados VARCHAR(100)
);


-- ============================================================
-- 04. GARANTIR COLUNAS DO HISTÓRICO DE MANUTENÇÃO
-- ============================================================

ALTER TABLE historico_manutencao
ADD COLUMN IF NOT EXISTS tipo_operacao VARCHAR(30)
DEFAULT 'MANUTENCAO';

ALTER TABLE historico_manutencao
ADD COLUMN IF NOT EXISTS data_inicio TIMESTAMP;

ALTER TABLE historico_manutencao
ADD COLUMN IF NOT EXISTS data_fim TIMESTAMP;

ALTER TABLE historico_manutencao
ADD COLUMN IF NOT EXISTS mensagem TEXT;

ALTER TABLE historico_manutencao
ADD COLUMN IF NOT EXISTS banco_dados VARCHAR(100);


-- ============================================================
-- 05. HISTÓRICO DE EXECUÇÕES
-- ============================================================

CREATE TABLE IF NOT EXISTS historico_execucoes (
    id UUID PRIMARY KEY,

    data_inicio TIMESTAMP NOT NULL,

    data_fim TIMESTAMP,

    duracao INTERVAL,

    banco_dados VARCHAR(100),

    regra_manutencao VARCHAR(255),

    manutencao_status VARCHAR(50),

    operacao VARCHAR(100) NOT NULL,

    status VARCHAR(50) NOT NULL,

    mensagem TEXT,

    arquivo_backup VARCHAR(500),

    destino_principal VARCHAR(500),

    destino_secundario VARCHAR(500),

    criptografado BOOLEAN DEFAULT FALSE,

    compactado BOOLEAN DEFAULT FALSE,

    quantidade_retencao INTEGER,

    -- Dados necessários para restauração
    chave_aes TEXT,

    iv_aes TEXT
);


-- ============================================================
-- 06. GARANTIR COLUNAS DO HISTÓRICO DE EXECUÇÕES
-- ============================================================

ALTER TABLE historico_execucoes
ADD COLUMN IF NOT EXISTS data_fim TIMESTAMP;

ALTER TABLE historico_execucoes
ADD COLUMN IF NOT EXISTS duracao INTERVAL;

ALTER TABLE historico_execucoes
ADD COLUMN IF NOT EXISTS banco_dados VARCHAR(100);

ALTER TABLE historico_execucoes
ADD COLUMN IF NOT EXISTS regra_manutencao VARCHAR(255);

ALTER TABLE historico_execucoes
ADD COLUMN IF NOT EXISTS manutencao_status VARCHAR(50);

ALTER TABLE historico_execucoes
ADD COLUMN IF NOT EXISTS mensagem TEXT;

ALTER TABLE historico_execucoes
ADD COLUMN IF NOT EXISTS arquivo_backup VARCHAR(500);

ALTER TABLE historico_execucoes
ADD COLUMN IF NOT EXISTS destino_principal VARCHAR(500);

ALTER TABLE historico_execucoes
ADD COLUMN IF NOT EXISTS destino_secundario VARCHAR(500);

ALTER TABLE historico_execucoes
ADD COLUMN IF NOT EXISTS criptografado BOOLEAN DEFAULT FALSE;

ALTER TABLE historico_execucoes
ADD COLUMN IF NOT EXISTS compactado BOOLEAN DEFAULT FALSE;

ALTER TABLE historico_execucoes
ADD COLUMN IF NOT EXISTS quantidade_retencao INTEGER;

ALTER TABLE historico_execucoes
ADD COLUMN IF NOT EXISTS chave_aes TEXT;

ALTER TABLE historico_execucoes
ADD COLUMN IF NOT EXISTS iv_aes TEXT;


-- ============================================================
-- 07. LOGS DE EXECUÇÃO
-- ============================================================

CREATE TABLE IF NOT EXISTS logs_execucao (
    id BIGSERIAL PRIMARY KEY,

    execucao_id UUID NOT NULL,

    data_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    etapa VARCHAR(50) NOT NULL,

    nivel VARCHAR(20) NOT NULL DEFAULT 'INFO',

    mensagem TEXT NOT NULL,

    detalhes JSONB,

    CONSTRAINT fk_log_execucao
        FOREIGN KEY (execucao_id)
        REFERENCES historico_execucoes(id)
        ON DELETE CASCADE
);


-- ============================================================
-- 08. ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_historico_execucoes_data_inicio
ON historico_execucoes(data_inicio DESC);

CREATE INDEX IF NOT EXISTS idx_historico_execucoes_status
ON historico_execucoes(status);

CREATE INDEX IF NOT EXISTS idx_logs_execucao_id
ON logs_execucao(execucao_id);

CREATE INDEX IF NOT EXISTS idx_logs_execucao_data_hora
ON logs_execucao(data_hora);


-- ============================================================
-- 09. DADOS DE TESTE - MARCAS
-- ============================================================

INSERT INTO marcas (nome, pais)
SELECT *
FROM (
    VALUES
        ('Toyota', 'Japão'),
        ('Honda', 'Japão'),
        ('Volkswagen', 'Alemanha'),
        ('Chevrolet', 'Estados Unidos'),
        ('Ford', 'Estados Unidos')
) AS dados(nome, pais)
WHERE NOT EXISTS (
    SELECT 1
    FROM marcas
);


-- ============================================================
-- 10. DADOS DE TESTE - VEÍCULOS
-- ============================================================

INSERT INTO veiculos
    (id_marca, modelo, placa, valor)
SELECT
    ((numero - 1) % 5) + 1,

    'Modelo Teste ' || numero,

    'TST' || LPAD(
        numero::TEXT,
        7,
        '0'
    ),

    ROUND(
        (
            30000 +
            RANDOM() * 300000
        )::NUMERIC,
        2
    )

FROM generate_series(
    1,
    10000
) AS numero

WHERE NOT EXISTS (
    SELECT 1
    FROM veiculos
);


-- ============================================================
-- 11. VERIFICAÇÃO
-- ============================================================

SELECT
    'marcas' AS tabela,
    COUNT(*) AS quantidade
FROM marcas

UNION ALL

SELECT
    'veiculos',
    COUNT(*)
FROM veiculos

UNION ALL

SELECT
    'historico_manutencao',
    COUNT(*)
FROM historico_manutencao

UNION ALL

SELECT
    'historico_execucoes',
    COUNT(*)
FROM historico_execucoes

UNION ALL

SELECT
    'logs_execucao',
    COUNT(*)
FROM logs_execucao;


-- ============================================================
-- 12. VERIFICAR COLUNAS DE RESTAURAÇÃO
-- ============================================================

SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'historico_execucoes'
AND column_name IN (
    'chave_aes',
    'iv_aes'
)
ORDER BY column_name;