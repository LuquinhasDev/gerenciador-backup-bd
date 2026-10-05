let pool = null;

const express =
    require("express");

const cors =
    require("cors");

const path =
    require("path");

const {
    criarPool,
    validarConfig,
    testarConexao,
    fecharPool
} = require("./database");

const { restaurarBackup } =
    require("./restoreService");

const {

    iniciarBackup,

    obterJob

} = require("./backupJobService");

const {
    criptografarAES,
    compactarZIP,
    protegerSegredo
} = require("./securityService");

const {

    aplicarRetencao,

    copiarParaDestino

} = require("./fileService");


const {

    buscarHistorico,

    buscarLogs

} = require("./logService");


const app =
    express();


app.use(
    cors()
);


app.use(
    express.json()
);


// ======================================================
// CONFIGURAÇÃO ATIVA
// ======================================================

let conexaoAtiva =
    null;


// ======================================================
// TESTAR CONEXÃO
// ======================================================

app.post(
    "/api/conexao/testar",
    async (req, res) => {

        try {

            const conexao =
                validarConfig(
                    req.body
                );


            const resultado =
                await testarConexao(
                    conexao
                );


            // Guarda somente a configuração.
            // NÃO guarda um pool encerrado.
            conexaoAtiva =
                conexao;


            res.json({

                sucesso:
                    true,

                mensagem:
                    "Conexão realizada com sucesso.",

                registros:
                    resultado.total

            });


        } catch (erro) {

            console.error(
                "[CONEXAO]",
                erro.message
            );


            res.status(500).json({

                sucesso:
                    false,

                mensagem:
                    erro.message

            });

        }

    }
);


// ======================================================
// INICIAR BACKUP
// ======================================================

app.post(
    "/api/backup",
    async (req, res) => {

        try {

            const {
                host,
                port,
                database,
                user,
                password,

                diretorioPrincipal,
                diretorioSecundario,

                criptografar,
                compactar,

                quantidade,
                forcarManutencao

            } = req.body;


            // ============================================
            // CONFIGURAÇÃO DO BANCO
            // ============================================

            console.log("CONFIGURAÇÃO RECEBIDA NO BACKUP:");
            console.log({
                host,
                port,
                database,
                user,
                password: password ? "***" : undefined
            });


            const conexao = validarConfig({

                host,
                port,
                database,
                user,
                password

            });


            // ============================================
            // DIRETÓRIO
            // ============================================

            if (
                !diretorioPrincipal ||
                typeof diretorioPrincipal !== "string"
            ) {

                return res.status(400).json({

                    sucesso: false,

                    mensagem:
                        "O diretório principal é obrigatório."

                });

            }


            // ============================================
            // RETENÇÃO
            // ============================================

            const quantidadeNumerica =
                Number(quantidade);


            if (
                !Number.isInteger(quantidadeNumerica) ||
                quantidadeNumerica < 1
            ) {

                return res.status(400).json({

                    sucesso: false,

                    mensagem:
                        "A quantidade de backups deve ser um número inteiro maior que zero."

                });

            }


            // ============================================
            // SALVAR CONEXÃO ATIVA
            // ============================================

            conexaoAtiva = conexao;


            // ============================================
            // CRIAR JOB
            // ============================================

            const job =
                iniciarBackup({

                    conexaoBanco:
                        conexao,

                    bancoDados:
                        database,

                    diretorioPrincipal,

                    destinoSecundario:
                        diretorioSecundario || null,

                    criptografar:
                        criptografar === true,

                    compactar:
                        compactar === true,

                    quantidadeRetencao:
                        quantidadeNumerica,

                    forcarManutencao:
                        forcarManutencao === true

                });


            return res.status(202).json({

                sucesso: true,

                jobId:
                    job.id,

                mensagem:
                    "Backup iniciado com sucesso."

            });

        } catch (erro) {

            console.error(
                "Erro ao iniciar backup:",
                erro
            );

            return res.status(500).json({

                sucesso: false,

                mensagem:
                    erro.message

            });

        }

    }
);

// ======================================================
// RESTAURAR BACKUP
// ======================================================

app.post(
    "/api/backup/restaurar",
    async (req, res) => {

        let bancoPool = null;

        try {

            const {
                execucaoId,
                host,
                port,
                database,
                user,
                password
            } = req.body;


            // ============================================
            // VALIDAR ID
            // ============================================

            if (!execucaoId) {

                return res.status(400).json({

                    sucesso: false,

                    mensagem:
                        "execucaoId é obrigatório."

                });

            }


            // ============================================
            // VALIDAR BANCO DE DESTINO
            // ============================================

            if (
                !host ||
                !port ||
                !database ||
                !user ||
                !password
            ) {

                return res.status(400).json({

                    sucesso: false,

                    mensagem:
                        "host, port, database, user e password são obrigatórios."

                });

            }


            // ============================================
            // VALIDAR CONFIGURAÇÃO
            // ============================================

            const configBanco =
                validarConfig({

                    host,
                    port,
                    database,
                    user,
                    password

                });


            // ============================================
            // CRIAR POOL DO BANCO ATUAL
            // ============================================

            if (!conexaoAtiva) {

                return res.status(400).json({

                    sucesso: false,

                    mensagem:
                        "Nenhum banco de dados está conectado."

                });

            }


            bancoPool =
                criarPool(
                    conexaoAtiva
                );


            // ============================================
            // RESTAURAR
            // ============================================

            const resultado =
                await restaurarBackup(

                    execucaoId,

                    configBanco,

                    bancoPool

                );


            // ============================================
            // RESPOSTA
            // ============================================

            return res.json(
                resultado
            );


        } catch (erro) {

            console.error(
                "Erro ao restaurar backup:",
                erro
            );


            return res.status(500).json({

                sucesso: false,

                mensagem:
                    erro.message

            });


        } finally {

            if (bancoPool) {

                await bancoPool.end();

            }

        }

    }
);

app.get(
    "/api/backup/status/:jobId",
    (req, res) => {

        try {

            const jobId =
                req.params.jobId;

            const job =
                obterJob(
                    jobId
                );


            if (!job) {

                return res.status(404).json({

                    sucesso:
                        false,

                    mensagem:
                        "Processo de backup não encontrado."

                });

            }


            res.json({

                sucesso:
                    true,

                job

            });

        } catch (erro) {

            console.error(
                "Erro ao consultar status:",
                erro
            );


            res.status(500).json({

                sucesso:
                    false,

                mensagem:
                    erro.message

            });

        }

    }
);

// ======================================================
// STATUS
// ======================================================

app.post(
    "/api/backup",
    async (req, res) => {

        try {

            console.log(
                "======================================"
            );

            console.log(
                "CONFIGURAÇÃO RECEBIDA NO BACKUP:"
            );

            console.log(
                JSON.stringify(
                    req.body,
                    null,
                    2
                )
            );

            console.log(
                "======================================"
            );


            // ==================================================
            // CONFIGURAÇÃO DO BANCO
            // ==================================================

            const conexaoRecebida =
                req.body.conexaoBanco ||
                req.body.configuracaoBanco ||
                req.body.banco ||
                req.body;


            const host =
                conexaoRecebida.host;

            const port =
                conexaoRecebida.port;

            const database =
                conexaoRecebida.database;

            const user =
                conexaoRecebida.user;

            const password =
                conexaoRecebida.password;


            // ==================================================
            // DEMAIS CONFIGURAÇÕES
            // ==================================================

            const diretorioPrincipal =
                req.body.diretorioPrincipal;

            const diretorioSecundario =
                req.body.diretorioSecundario;

            const criptografar =
                req.body.criptografar === true;

            const compactar =
                req.body.compactar === true;

            const quantidade =
                Number(
                    req.body.quantidade
                );

            const forcarManutencao =
                req.body.forcarManutencao === true;


            // ==================================================
            // DEBUG
            // ==================================================

            console.log(
                "CONFIGURAÇÃO DO BANCO EXTRAÍDA:"
            );

            console.log({
                host,
                port,
                database,
                user,
                password:
                    password
                        ? "********"
                        : undefined
            });


            // ==================================================
            // VALIDAR CONFIGURAÇÃO
            // ==================================================

            const conexao =
                validarConfig({
                    host,
                    port,
                    database,
                    user,
                    password
                });


            // ==================================================
            // VALIDAR DIRETÓRIO PRINCIPAL
            // ==================================================

            if (
                !diretorioPrincipal ||
                typeof diretorioPrincipal !== "string"
            ) {

                return res.status(400).json({

                    sucesso: false,

                    mensagem:
                        "O diretório principal é obrigatório."

                });

            }


            // ==================================================
            // VALIDAR RETENÇÃO
            // ==================================================

            if (
                !Number.isInteger(
                    quantidade
                ) ||
                quantidade < 1
            ) {

                return res.status(400).json({

                    sucesso: false,

                    mensagem:
                        "A quantidade de backups deve ser um número inteiro maior que zero."

                });

            }


            // ==================================================
            // SALVAR CONEXÃO ATIVA
            // ==================================================

            conexaoAtiva =
                conexao;


            // ==================================================
            // CRIAR JOB
            // ==================================================

            const job =
                iniciarBackup({

                    conexaoBanco:
                        conexao,

                    bancoDados:
                        database,

                    diretorioPrincipal,

                    destinoSecundario:
                        diretorioSecundario ||
                        null,

                    criptografar,

                    compactar,

                    quantidadeRetencao:
                        quantidade,

                    forcarManutencao

                });


            // ==================================================
            // RESPOSTA
            // ==================================================

            return res.status(202).json({

                sucesso: true,

                jobId:
                    job.id,

                mensagem:
                    "Backup iniciado com sucesso."

            });


        } catch (erro) {

            console.error(
                "Erro ao iniciar backup:"
            );

            console.error(
                erro
            );


            return res.status(500).json({

                sucesso: false,

                mensagem:
                    erro.message

            });

        }

    }
);


// ======================================================
// HISTÓRICO
// ======================================================

// ======================================================
// HISTÓRICO
// ======================================================

app.get(
    "/api/historico",
    async (req, res) => {

        let bancoPool = null;

        try {

            if (!conexaoAtiva) {

                return res.status(400).json({

                    sucesso: false,

                    mensagem:
                        "Nenhum banco de dados está conectado."

                });

            }


            // Cria um pool usando a conexão atualmente configurada
            bancoPool =
                criarPool(
                    conexaoAtiva
                );


            const historico =
                await buscarHistorico(
                    bancoPool
                );


            return res.json({

                sucesso: true,

                historico

            });


        } catch (erro) {

            console.error(
                "Erro ao buscar histórico:",
                erro
            );


            return res.status(500).json({

                sucesso: false,

                mensagem:
                    erro.message

            });


        } finally {

            if (bancoPool) {

                await bancoPool.end();

            }

        }

    }
);


// ======================================================
// LOG
// ======================================================

app.get(
    "/api/historico/:id/logs",
    async (req, res) => {

        let bancoPool = null;

        try {

            if (!conexaoAtiva) {

                return res.status(400).json({

                    sucesso: false,

                    mensagem:
                        "Nenhum banco de dados está conectado."

                });

            }


            bancoPool =
                criarPool(
                    conexaoAtiva
                );


            const logs =
                await buscarLogs(
                    req.params.id,
                    bancoPool
                );


            return res.json({

                sucesso: true,

                logs

            });


        } catch (erro) {

            console.error(
                "Erro ao buscar logs:",
                erro
            );


            return res.status(500).json({

                sucesso: false,

                mensagem:
                    erro.message

            });


        } finally {

            if (bancoPool) {

                await bancoPool.end();

            }

        }

    }
);


// ======================================================
// TESTE DE RETENÇÃO
// ======================================================

app.post(
    "/api/backup/teste-retencao",
    (
        req,
        res
    ) => {

        try {

            const resultado =
                aplicarRetencao(

                    path.join(
                        __dirname,
                        "..",
                        "backups"
                    ),

                    req.body.quantidade

                );


            res.json({

                sucesso:
                    true,

                resultado

            });

        } catch (erro) {

            res.status(500).json({

                sucesso:
                    false,

                mensagem:
                    erro.message

            });

        }

    }
);


// ======================================================
// SERVIDOR
// ======================================================

const PORT =
    3000;


app.listen(
    PORT,
    () => {

        console.log(
            `Servidor rodando na porta ${PORT}`
        );

    }
);

// ======================================================
// ENCERRAMENTO DO SERVIDOR
// ======================================================

async function encerrarServidor() {

    console.log(
        "\nEncerrando servidor..."
    );


    try {

        await fecharPool();

        console.log(
            "Pool do banco encerrado."
        );

    } catch (erro) {

        console.error(
            "Erro ao fechar pool:",
            erro.message
        );

    }


    process.exit(0);

}


process.on(
    "SIGINT",
    encerrarServidor
);


process.on(
    "SIGTERM",
    encerrarServidor
);