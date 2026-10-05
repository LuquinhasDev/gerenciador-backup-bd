// backupService.js

const {
    spawn
} = require("child_process");

const {
    obterPgDump
} = require("./executableService");

const path =
    require("path");

const fs =
    require("fs");


// ======================================================
// CRIAR BACKUP
// ======================================================

async function criarBackup(
    conexao,
    pastaBackups
) {

    return new Promise(
        (resolve, reject) => {

            const inicio =
                new Date();


            if (!pastaBackups) {

                pastaBackups =
                    path.join(
                        __dirname,
                        "..",
                        "backups"
                    );

            }


            if (
                !fs.existsSync(
                    pastaBackups
                )
            ) {

                fs.mkdirSync(
                    pastaBackups,
                    {
                        recursive:
                            true
                    }
                );

            }


            const nomeArquivo =
                `backup_${new Date()
                    .toISOString()
                    .replace(
                        /[:.]/g,
                        "-"
                    )}.dump`;


            const caminhoBackup =
                path.join(
                    pastaBackups,
                    nomeArquivo
                );


            const processo =
                spawn(
                     obterPgDump(),
                    [
                        "-h",
                        conexao.host,

                        "-p",
                        String(
                            conexao.port
                        ),

                        "-U",
                        conexao.user,

                        "-F",
                        "c",

                        "-f",
                        caminhoBackup,

                        conexao.database
                    ],
                    {
                        env: {
                            ...process.env,

                            PGPASSWORD:
                                conexao.password
                        }
                    }
                );


            let erro =
                "";


            processo.stderr.on(
                "data",
                data => {

                    erro +=
                        data.toString();

                }
            );


            processo.on(
                "error",
                erroProcesso => {

                    reject(
                        erroProcesso
                    );

                }
            );


            processo.on(
                "close",
                codigo => {

                    const fim =
                        new Date();


                    if (
                        codigo !== 0
                    ) {

                        reject(
                            new Error(
                                erro ||
                                `pg_dump terminou com código ${codigo}`
                            )
                        );

                        return;

                    }


                    if (
                        !fs.existsSync(
                            caminhoBackup
                        )
                    ) {

                        reject(
                            new Error(
                                "O pg_dump terminou, mas o arquivo de backup não foi criado."
                            )
                        );

                        return;

                    }


                    const tamanho =
                        fs.statSync(
                            caminhoBackup
                        ).size;


                    resolve({

                        sucesso:
                            true,

                        arquivo:
                            nomeArquivo,

                        caminho:
                            caminhoBackup,

                        tamanho,

                        inicio,

                        fim

                    });

                }
            );

        }
    );

}


// ======================================================
// REGISTRAR BACKUP
// ======================================================

async function registrarBackup(
    dbPool,
    resultado
) {

    if (
        !dbPool
    ) {

        throw new Error(
            "Pool do banco não informado para registrar o backup."
        );

    }


    const duracao =
        Math.round(
            (
                resultado.fim -
                resultado.inicio
            ) / 1000
        );


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
            'BACKUP',
            $1,
            $2,
            'BACKUP',
            $3,
            $4,
            $5,
            current_database()
        )
        `,
        [
            duracao,

            resultado.sucesso
                ? "SUCESSO"
                : "FALHA",

            resultado.inicio,

            resultado.fim,

            `Arquivo: ${resultado.arquivo} | Tamanho: ${resultado.tamanho} bytes`
        ]
    );

}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    criarBackup,

    registrarBackup

};