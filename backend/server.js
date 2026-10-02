const express = require("express");
const cors = require("cors");

const pool = require("./database");

const {
    iniciarBackup,
    obterJob
} = require("./backupJobService");

const app = express();

const PORT = 3000;


/*
|--------------------------------------------------------------------------
| Middlewares
|--------------------------------------------------------------------------
*/

app.use(cors());

app.use(express.json());


/*
|--------------------------------------------------------------------------
| Teste da API
|--------------------------------------------------------------------------
*/

app.get("/api/status", (req, res) => {

    res.json({
        sucesso: true,
        mensagem: "Servidor funcionando."
    });

});


/*
|--------------------------------------------------------------------------
| Testar conexão com o banco
|--------------------------------------------------------------------------
*/

app.get("/api/veiculos", async (req, res) => {

    try {

        const resultado = await pool.query(`
            SELECT *
            FROM veiculos
        `);

        res.json(resultado.rows);

    } catch (erro) {

        console.error(
            "Erro ao consultar banco:",
            erro.message
        );

        res.status(500).json({
            sucesso: false,
            erro: "Erro ao conectar ou consultar o banco."
        });

    }

});


/*
|--------------------------------------------------------------------------
| INICIAR BACKUP
|--------------------------------------------------------------------------
|
| O backup é iniciado em segundo plano.
|
| O frontend recebe imediatamente o ID do processo.
|
*/

// ======================================================
// INICIAR BACKUP
// ======================================================

app.post(
    "/api/backup",
    async (req, res) => {

        try {

            const {

                diretorioPrincipal,

                diretorioSecundario,

                criptografar,

                compactar,

                quantidade,

                forcarManutencao

            } = req.body;


            const job =
                iniciarBackup({

                    diretorioPrincipal,

                    destinoSecundario:
                        diretorioSecundario,

                    criptografar:
                        criptografar === true,

                    compactar:
                        compactar === true,

                    quantidadeRetencao:
                        Number(quantidade),

                    forcarManutencao:
                        forcarManutencao === true

                });


            res.status(202).json({

                sucesso: true,

                jobId:
                    job.jobId

            });


        } catch (erro) {

            console.error(
                "Erro ao iniciar backup:",
                erro
            );


            res.status(500).json({

                sucesso: false,

                mensagem:
                    erro.message

            });

        }

    }
);

app.post("/api/backup/iniciar", async (req, res) => {

    try {

        const {
            forcarManutencao = false,
            criptografar = false,
            compactar = false,
            quantidadeRetencao = 5,
            diretorioPrincipal = null,
            destinoSecundario = null
        } = req.body;


        /*
         * Validação do diretório principal
         */

        if (
            !diretorioPrincipal ||
            typeof diretorioPrincipal !== "string" ||
            diretorioPrincipal.trim() === ""
        ) {

            return res.status(400).json({

                sucesso: false,

                mensagem:
                    "O diretório principal é obrigatório."

            });

        }


        /*
         * Validação da retenção
         */

        const quantidade =
            Number(quantidadeRetencao);


        if (
            !Number.isInteger(quantidade) ||
            quantidade < 1
        ) {

            return res.status(400).json({

                sucesso: false,

                mensagem:
                    "A quantidade de backups deve ser um número inteiro maior que zero."

            });

        }


        /*
         * Validação do destino secundário
         */

        if (
            destinoSecundario !== null &&
            destinoSecundario !== undefined &&
            typeof destinoSecundario !== "string"
        ) {

            return res.status(400).json({

                sucesso: false,

                mensagem:
                    "O diretório secundário informado é inválido."

            });

        }


        /*
         * Cria o job
         */


        const job =
            iniciarBackup({

                forcarManutencao:
                    Boolean(forcarManutencao),

                criptografar:
                    Boolean(criptografar),

                compactar:
                    Boolean(compactar),

                quantidadeRetencao:
                    quantidade,

                diretorioPrincipal:
                    diretorioPrincipal,

                destinoSecundario:
                    destinoSecundario || null

            });


        /*
         * Retorna imediatamente.
         *
         * O backup continua sendo executado
         * em segundo plano.
         */

        return res.status(202).json({

            sucesso: true,

            mensagem:
                "Processo de backup iniciado.",

            job: {

                id:
                    job.id,

                status:
                    job.status,

                etapa:
                    job.etapa,

                progresso:
                    job.progresso,

                mensagem:
                    job.mensagem

            }

        });


    } catch (erro) {

        console.error(
            "Erro ao iniciar backup:",
            erro.message
        );


        return res.status(500).json({

            sucesso: false,

            mensagem:
                "Não foi possível iniciar o backup."

        });

    }

});


/*
|--------------------------------------------------------------------------
| CONSULTAR STATUS DO BACKUP
|--------------------------------------------------------------------------
*/

// ======================================================
// CONSULTAR STATUS DO BACKUP
// ======================================================

app.get(
    "/api/backup/:id",
    (req, res) => {

        try {

            const job =
                obterJob(
                    req.params.id
                );


            if (!job) {

                return res.status(404).json({

                    sucesso: false,

                    mensagem:
                        "Job de backup não encontrado."

                });

            }


            res.json({

                sucesso: true,

                job

            });


        } catch (erro) {

            console.error(
                "Erro ao consultar job:",
                erro
            );


            res.status(500).json({

                sucesso: false,

                mensagem:
                    "Erro ao consultar o processo de backup."

            });

        }

    }
);

app.get("/api/backup/status/:id", (req, res) => {

    try {

        const id =
            req.params.id;


        const job =
            obterJob(id);


        if (!job) {

            return res.status(404).json({

                sucesso: false,

                mensagem:
                    "Processo de backup não encontrado."

            });

        }


        return res.json({

            sucesso: true,

            job

        });

    } catch (erro) {

        console.error(
            "Erro ao consultar status:",
            erro.message
        );


        return res.status(500).json({

            sucesso: false,

            mensagem:
                "Erro ao consultar o processo de backup."

        });

    }

});


/*
|--------------------------------------------------------------------------
| HISTÓRICO DE EXECUÇÕES
|--------------------------------------------------------------------------
*/

app.get("/api/backup/historico", async (req, res) => {

    try {

        const resultado =
            await pool.query(`

                SELECT
                    id,
                    data_hora,
                    regra_aplicada,
                    duracao,
                    status,
                    tipo_operacao,
                    data_inicio,
                    data_fim,
                    mensagem,
                    banco_dados

                FROM historico_manutencao

                ORDER BY data_hora DESC

                LIMIT 50

            `);


        return res.json({

            sucesso: true,

            historico:
                resultado.rows

        });

    } catch (erro) {

        console.error(
            "Erro ao buscar histórico:",
            erro.message
        );


        return res.status(500).json({

            sucesso: false,

            mensagem:
                "Não foi possível carregar o histórico."

        });

    }

});


/*
|--------------------------------------------------------------------------
| INICIAR SERVIDOR
|--------------------------------------------------------------------------
*/

app.listen(PORT, () => {

    console.log(
        `Servidor rodando na porta ${PORT}`
    );

});