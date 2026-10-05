// ======================================================
// BUSCAR ÚLTIMA MANUTENÇÃO
// ======================================================

async function buscarUltimaManutencao(
    dbPool
) {

    const resultado =
        await dbPool.query(
            `
            SELECT
                data_hora,
                data_fim,
                regra_aplicada,
                status

            FROM historico_manutencao

            WHERE tipo_operacao = 'MANUTENCAO'

              AND status = 'SUCESSO'

              AND data_hora IS NOT NULL

            ORDER BY
                data_hora DESC

            LIMIT 1
            `
        );


    return (
        resultado.rows[0] ||
        null
    );

}


// ======================================================
// DECIDIR MANUTENÇÃO
// ======================================================

function decidirManutencao(
    ultimaManutencao,
    forcarManutencao = false
) {

    if (
        forcarManutencao
    ) {

        return {

            acao:
                "VACUUM_FULL_ANALYZE",

            regra:
                "MANUTENCAO_MANUAL"

        };

    }


    if (
        !ultimaManutencao
    ) {

        return {

            acao:
                "VACUUM_FULL_ANALYZE",

            regra:
                "SEM_HISTORICO"

        };

    }


    const dataUltima =
        new Date(
            ultimaManutencao.data_fim ||
            ultimaManutencao.data_hora
        );


    const agora =
        new Date();


    const diferencaMs =
        agora -
        dataUltima;


    const dias =
        diferencaMs /
        (
            1000 *
            60 *
            60 *
            24
        );


    if (
        dias < 30
    ) {

        return {

            acao:
                "NENHUMA",

            regra:
                "MENOS_DE_30_DIAS",

            dias

        };

    }


    if (
        dias <= 60
    ) {

        return {

            acao:
                "VACUUM",

            regra:
                "ENTRE_30_E_60_DIAS",

            dias

        };

    }


    return {

        acao:
            "VACUUM_FULL_ANALYZE",

        regra:
            "MAIS_DE_60_DIAS",

        dias

    };

}


// ======================================================
// EXECUTAR MANUTENÇÃO
// ======================================================

async function executarManutencao(
    acao,
    dbPool
) {

    if (
        acao === "NENHUMA"
    ) {

        return {

            sucesso:
                true,

            inicio:
                new Date(),

            fim:
                new Date(),

            mensagem:
                "Nenhuma manutenção necessária."

        };

    }


    const inicio =
        new Date();


    try {

        if (
            acao === "VACUUM"
        ) {

            await dbPool.query(
                "VACUUM"
            );

        }


        if (
            acao ===
            "VACUUM_FULL_ANALYZE"
        ) {

            await dbPool.query(
                "VACUUM FULL ANALYZE"
            );

        }


        const fim =
            new Date();


        return {

            sucesso:
                true,

            inicio,

            fim,

            mensagem:
                `Manutenção ${acao} executada com sucesso.`

        };

    } catch (erro) {

        const fim =
            new Date();


        return {

            sucesso:
                false,

            inicio,

            fim,

            mensagem:
                erro.message

        };

    }

}


// ======================================================
// REGISTRAR MANUTENÇÃO
// ======================================================

async function registrarManutencao({

    inicio,

    fim,

    regra,

    status,

    mensagem

}, dbPool) {

    const duracao =
        fim && inicio
            ? Math.round(
                (
                    fim -
                    inicio
                ) / 1000
            )
            : null;


    await dbPool.query(
        `
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
            NOW(),
            $1,
            $2,
            $3,
            'MANUTENCAO',
            $4,
            $5,
            $6,
            current_database()
        )
        `,
        [

            regra,

            duracao,

            status,

            inicio,

            fim,

            mensagem

        ]
    );

}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    buscarUltimaManutencao,

    decidirManutencao,

    executarManutencao,

    registrarManutencao

};