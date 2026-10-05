-- =========================================================
-- DADOS DE TESTE
-- =========================================================

INSERT INTO historico_manutencao
(
    data_hora,
    regra_aplicada,
    duracao,
    status,
    tipo_operacao,
    data_inicio,
    data_fim,
    mensagem,
    banco_dados
)
VALUES
(
    CURRENT_TIMESTAMP,
    'Manutenção preventiva',
    INTERVAL '00:00:05',
    'SUCESSO',
    'MANUTENCAO',
    CURRENT_TIMESTAMP - INTERVAL '5 seconds',
    CURRENT_TIMESTAMP,
    'Manutenção executada com sucesso.',
    'gestao_veiculos'
);