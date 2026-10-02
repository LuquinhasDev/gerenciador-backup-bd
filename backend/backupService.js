const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const pool = require("./database");

async function criarBackup(pastaBackups) {

    return new Promise((resolve, reject) => {

        const inicio = new Date();

        // Se nenhuma pasta for informada,
        // utiliza a pasta padrão do projeto.
        if (!pastaBackups) {
            pastaBackups = path.join(
                __dirname,
                "..",
                "backups"
            );
        }

        if (!fs.existsSync(pastaBackups)) {

            fs.mkdirSync(
                pastaBackups,
                {
                    recursive: true
                }
            );

        }

        const nomeArquivo =
            `backup_${new Date()
                .toISOString()
                .replace(/[:.]/g, "-")}.dump`;

        const caminhoBackup =
            path.join(
                pastaBackups,
                nomeArquivo
            );

        const processo = spawn("pg_dump", [

            "-h",
            process.env.DB_HOST,

            "-p",
            process.env.DB_PORT,

            "-U",
            process.env.DB_USER,

            "-F",
            "c",

            "-f",
            caminhoBackup,

            process.env.DB_NAME

        ], {

            env: {
                ...process.env,
                PGPASSWORD:
                    process.env.DB_PASSWORD
            }

        });

        let erro = "";

        processo.stderr.on(
            "data",
            (data) => {

                erro += data.toString();

            }
        );

        processo.on(
            "error",
            (err) => {

                reject(err);

            }
        );

        processo.on(
            "close",
            (codigo) => {

                const fim = new Date();

                if (codigo !== 0) {

                    reject(
                        new Error(
                            erro ||
                            `pg_dump terminou com código ${codigo}`
                        )
                    );

                    return;
                }

                const tamanho =
                    fs.statSync(
                        caminhoBackup
                    ).size;

                resolve({

                    sucesso: true,

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

    });

}


async function registrarBackup(resultado) {

    const duracao =
        Math.round(
            (
                resultado.fim -
                resultado.inicio
            ) / 1000
        );

    await pool.query(`

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

    `, [

        duracao,

        resultado.sucesso
            ? "SUCESSO"
            : "FALHA",

        resultado.inicio,

        resultado.fim,

        `Arquivo: ${resultado.arquivo} | Tamanho: ${resultado.tamanho} bytes`

    ]);

}


module.exports = {

    criarBackup,

    registrarBackup

};