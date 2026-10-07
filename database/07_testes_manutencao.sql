-- ==========================================================
-- TESTES DOS CENÁRIOS DE MANUTENÇÃO
-- Plataforma de Gerenciamento de Backup
-- ==========================================================


-- ==========================================================
-- BACKUP DO HISTÓRICO ORIGINAL
-- ==========================================================

CREATE TABLE IF NOT EXISTS backup_teste_historico_manutencao AS
SELECT *
FROM historico_manutencao;


-- ==========================================================
-- CENÁRIO 1
-- ENTRE 30 E 60 DIAS
-- ==========================================================

DELETE FROM historico_manutencao
WHERE tipo_operacao = 'MANUTENCAO';

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
    NOW() - INTERVAL '45 days',
    'ENTRE_30_E_60_DIAS',
    INTERVAL '2 seconds',
    'SUCESSO',
    'MANUTENCAO',
    NOW() - INTERVAL '45 days',
    NOW() - INTERVAL '45 days' + INTERVAL '2 seconds',
    'Teste do cenário entre 30 e 60 dias.',
    current_database()
);


-- ==========================================================
-- CENÁRIO 2
-- ACIMA DE 60 DIAS
-- ==========================================================

-- Execute este bloco separadamente após finalizar
-- o teste anterior.

-- DELETE FROM historico_manutencao
-- WHERE tipo_operacao = 'MANUTENCAO';

-- INSERT INTO historico_manutencao
-- (
--     data_hora,
--     regra_aplicada,
--     duracao,
--     status,
--     tipo_operacao,
--     data_inicio,
--     data_fim,
--     mensagem,
--     banco_dados
-- )
-- VALUES
-- (
--     NOW() - INTERVAL '75 days',
--     'ACIMA_DE_60_DIAS',
--     INTERVAL '2 seconds',
--     'SUCESSO',
--     'MANUTENCAO',
--     NOW() - INTERVAL '75 days',
--     NOW() - INTERVAL '75 days' + INTERVAL '2 seconds',
--     'Teste do cenário acima de 60 dias.',
--     current_database()
-- );


-- ==========================================================
-- CENÁRIO 3
-- AUSÊNCIA DE HISTÓRICO
-- ==========================================================

-- Execute este comando separadamente após finalizar
-- os testes anteriores.

DELETE FROM historico_manutencao
WHERE tipo_operacao = 'MANUTENCAO';


-- ==========================================================
-- CONSULTA PARA CONFERÊNCIA
-- ==========================================================

SELECT
    id,
    data_hora,
    regra_aplicada,
    tipo_operacao,
    status,
    banco_dados
FROM historico_manutencao
ORDER BY data_hora DESC;