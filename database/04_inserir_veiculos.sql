-- =========================================================
-- MASSA DE DADOS: VEICULOS
-- =========================================================

INSERT INTO veiculos
    (
        id_marca,
        modelo,
        placa,
        valor
    )
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
) AS numero;