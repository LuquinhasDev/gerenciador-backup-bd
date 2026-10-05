-- =========================================================
-- TABELA: MARCAS
-- =========================================================

CREATE TABLE IF NOT EXISTS marcas (
    id_marca SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    pais VARCHAR(100) NOT NULL
);


-- =========================================================
-- TABELA: VEICULOS
-- =========================================================

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


-- =========================================================
-- TABELA: HISTORICO DE MANUTENCAO
-- =========================================================

CREATE TABLE IF NOT EXISTS historico_manutencao (
    id SERIAL PRIMARY KEY,
    data_hora TIMESTAMP,
    regra_aplicada VARCHAR(255),
    duracao INTERVAL,
    status VARCHAR(50)
);


-- =========================================================
-- TABELA: HISTORICO DE EXECUCOES
-- =========================================================

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

    quantidade_retencao INTEGER
);


-- =========================================================
-- TABELA: LOGS DE EXECUCAO
-- =========================================================

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