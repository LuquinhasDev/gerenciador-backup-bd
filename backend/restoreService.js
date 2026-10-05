const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const {
    obterPgRestore,
    obter7Zip
} = require("./executableService");


const pool =
    require("./database");

const {
    descriptografarAES,
    desprotegerSegredo
} = require("./securityService");


// ======================================================
// BUSCAR EXECUÇÃO
// ======================================================

async function buscarExecucao(
    execucaoId,
    dbPool
) {

    if (!dbPool) {

        throw new Error(
            "Pool do banco de dados não informado."
        );

    }


    const resultado =
        await dbPool.query(
            `
            SELECT
                id,
                banco_dados,
                arquivo_backup,
                criptografado,
                compactado,
                chave_aes,
                iv_aes

            FROM historico_execucoes

            WHERE id = $1

            LIMIT 1
            `,
            [
                execucaoId
            ]
        );


    return resultado.rows[0] || null;

}


// ======================================================
// EXECUTAR COMANDO
// ======================================================

function executarComando(
    comando,
    argumentos
) {

    return new Promise(
        (resolve, reject) => {

            const processo =
                spawn(
                    comando,
                    argumentos,
                    {
                        windowsHide: true
                    }
                );

            let stderr = "";

            processo.stderr.on(
                "data",
                data => {

                    stderr +=
                        data.toString();

                }
            );

            processo.on(
                "error",
                reject
            );

            processo.on(
                "close",
                codigo => {

                    if (codigo !== 0) {

                        reject(
                            new Error(
                                stderr ||
                                `Comando terminou com código ${codigo}.`
                            )
                        );

                        return;

                    }

                    resolve();

                }
            );

        }
    );

}


// ======================================================
// EXTRAIR ZIP
// ======================================================

async function extrairZIP(
    caminhoZIP,
    destino
) {

    if (
        !process.env.ZIP_PASSWORD
    ) {

        throw new Error(
            "ZIP_PASSWORD não configurada."
        );

    }

    if (
        !fs.existsSync(
            destino
        )
    ) {

        fs.mkdirSync(
            destino,
            {
                recursive: true
            }
        );

    }

    const argumentos = [

        "x",

        caminhoZIP,

        `-p${process.env.ZIP_PASSWORD}`,

        `-o${destino}`,

        "-y"

    ];

    await executarComando(
        obter7Zip(),
        argumentos
    );

    const arquivos =
        fs.readdirSync(
            destino
        );

    if (!arquivos.length) {

        throw new Error(
            "Nenhum arquivo foi extraído do ZIP."
        );

    }

    return path.join(
        destino,
        arquivos[0]
    );

}


// ======================================================
// RESTAURAR BACKUP
// ======================================================

async function restaurarBackup(
    execucaoId,
    configBanco,
    dbPool
) {

    if (!dbPool) {

        throw new Error(
            "Pool do banco de dados não informado."
        );

    }


    const execucao =
        await buscarExecucao(
            execucaoId,
            dbPool
        );


    if (!execucao) {

        throw new Error(
            "Execução de backup não encontrada."
        );

    }


    if (
        !execucao.arquivo_backup
    ) {

        throw new Error(
            "O backup não possui arquivo associado."
        );

    }


    if (
        !fs.existsSync(
            execucao.arquivo_backup
        )
    ) {

        throw new Error(
            "O arquivo de backup não foi encontrado."
        );

    }


    const pastaTemporaria =
        path.join(
            path.dirname(
                execucao.arquivo_backup
            ),
            `.restore_${execucao.id}`
        );


    if (
        fs.existsSync(
            pastaTemporaria
        )
    ) {

        fs.rmSync(
            pastaTemporaria,
            {
                recursive: true,
                force: true
            }
        );

    }


    fs.mkdirSync(
        pastaTemporaria,
        {
            recursive: true
        }
    );


    try {

        let arquivo =
            execucao.arquivo_backup;


        // ==================================================
        // ZIP
        // ==================================================

        if (
            execucao.compactado
        ) {

            arquivo =
                await extrairZIP(
                    arquivo,
                    pastaTemporaria
                );

        }


        // ==================================================
        // AES
        // ==================================================

        if (
            execucao.criptografado
        ) {

            if (
                !execucao.chave_aes ||
                !execucao.iv_aes
            ) {

                throw new Error(
                    "A chave AES deste backup não está armazenada."
                );

            }


            const chave =
                desprotegerSegredo(
                    execucao.chave_aes
                );


            const iv =
                desprotegerSegredo(
                    execucao.iv_aes
                );


            const arquivoDump =
                path.join(
                    pastaTemporaria,
                    `restauracao_${Date.now()}.dump`
                );


            await descriptografarAES({

                caminhoArquivo:
                    arquivo,

                chave,

                iv,

                caminhoSaida:
                    arquivoDump

            });


            arquivo =
                arquivoDump;

        }


        // ==================================================
        // VALIDAR CONFIGURAÇÃO
        // ==================================================

        if (
            !configBanco
        ) {

            throw new Error(
                "Configuração do banco de destino não informada."
            );

        }


        if (
            !configBanco.host ||
            !configBanco.port ||
            !configBanco.database ||
            !configBanco.user ||
            !configBanco.password
        ) {

            throw new Error(
                "Configuração do banco de destino incompleta."
            );

        }


        // ==================================================
        // RESTAURAÇÃO
        // ==================================================

        const args = [

            "-h",
            String(
                configBanco.host
            ),

            "-p",
            String(
                configBanco.port
            ),

            "-U",
            String(
                configBanco.user
            ),

            "-d",
            String(
                configBanco.database
            ),

            "-F",
            "c",

            "--clean",

            "--if-exists",

            arquivo

        ];


        await new Promise(
            (resolve, reject) => {

                const processo =
                    spawn(
                        obterPgRestore(),
                        args,
                        {

                            env: {

                                ...process.env,

                                PGPASSWORD:
                                    String(
                                        configBanco.password
                                    )

                            },

                            windowsHide:
                                true

                        }
                    );


                let stderr = "";


                processo.stderr.on(
                    "data",
                    data => {

                        stderr +=
                            data.toString();

                    }
                );


                processo.on(
                    "error",
                    reject
                );


                processo.on(
                    "close",
                    codigo => {

                        if (
                            codigo !== 0
                        ) {

                            reject(
                                new Error(
                                    stderr ||
                                    `pg_restore terminou com código ${codigo}.`
                                )
                            );

                            return;

                        }


                        resolve();

                    }
                );

            }
        );


        return {

            sucesso: true,

            mensagem:
                "Backup restaurado com sucesso.",

            arquivo

        };


    } finally {

        if (
            fs.existsSync(
                pastaTemporaria
            )
        ) {

            fs.rmSync(
                pastaTemporaria,
                {
                    recursive: true,
                    force: true
                }
            );

        }

    }

}


module.exports = {

    restaurarBackup

};