CREATE TABLE marcas (
    id_marca SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    pais VARCHAR(100) NOT NULL
);

CREATE TABLE veiculos (
    id_veiculo SERIAL PRIMARY KEY,
    id_marca INTEGER NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    placa VARCHAR(10) NOT NULL,
    valor NUMERIC(12, 2) NOT NULL,

    CONSTRAINT fk_veiculo_marca
        FOREIGN KEY (id_marca)
        REFERENCES marcas(id_marca)
);

CREATE TABLE historico_manutencao (
    id SERIAL PRIMARY KEY,
    data_hora TIMESTAMP,
    regra_aplicada VARCHAR(255),
    duracao INTERVAL,
    status VARCHAR(50)
);