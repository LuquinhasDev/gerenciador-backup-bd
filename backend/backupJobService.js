const crypto =
    require("crypto");

const fs =
    require("fs");

const {
    criarPool,
    validarConfig
} = require("./database");


const {
    buscarUltimaManutencao,
    decidirManutencao,
    executarManutencao,
    registrarManutencao
} = require("./maintenanceService");


const {
    criarBackup,
    registrarBackup
} = require("./backupService");


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
    criarExecucao,
    registrarLog,
    finalizarExecucao
} = require("./logService");


const jobs =
    new Map();


// ======================================================
// CRIAR JOB
// ======================================================

function criarJob() {

    const id =
        crypto.randomUUID();


    const job = {

        id,

        status:
            "INICIANDO",

        etapa:
            "INICIANDO",

        progresso:
            0,

        mensagem:
            "Preparando processo de backup...",

        inicio:
            new Date(),

        fim:
            null,

        erro:
            null,

        resultado:
            null,

        logs:
            []

    };


    jobs.set(
        id,
        job
    );


    return job;

}


// ======================================================
// ATUALIZAR JOB
// ======================================================

function atualizarJob(
    id,
    dados
) {

    const job =
        jobs.get(id);


    if (!job) {
        return;
    }


    Object.assign(
        job,
        dados
    );

}


// ======================================================
// OBTER JOB
// ======================================================

function obterJob(
    id
) {

    return jobs.get(
        id
    );

}


// ======================================================
// LOG
// ======================================================

async function adicionarLog(
    job,
    etapa,
    mensagem,
    nivel = "INFO",
    detalhes = null,
    dbPool = null
) {

    const registro = {

        data_hora:
            new Date(),

        etapa,

        nivel,

        mensagem,

        detalhes

    };


    job.logs.push(
        registro
    );


    atualizarJob(
        job.id,
        {

            etapa,

            mensagem

        }
    );


    try {

        await registrarLog(
            {
                execucaoId:
                    job.id,

                etapa,

                mensagem,

                nivel,

                detalhes
            },
            dbPool
        );

    } catch (erro) {

        console.error(
            "Erro ao persistir log:",
            erro.message
        );

    }

}


// ======================================================
// EXECUTAR BACKUP
// ======================================================

async function executarBackup(
    job,
    opcoes = {}
) {

    let dbPool = null;
    let decisao = null;
    let resultadoManutencao = null;
    let resultadoBackup = null;
    let arquivoAtual = null;
    let resultadoRetencao = null;
    let resultadoCopia = null;
    let chaveAesProtegida = null;
    let ivAesProtegido = null;

    try {

        const {

            conexaoBanco,

            bancoDados,

            forcarManutencao =
            false,

            criptografar =
            false,

            compactar =
            false,

            quantidadeRetencao =
            5,

            diretorioPrincipal,

            destinoSecundario =
            null

        } = opcoes;


        // ==================================================
        // CONFIGURAÇÃO
        // ==================================================

        const conexao =
            validarConfig(
                conexaoBanco
            );


        // ==================================================
        // CONEXÃO
        // ==================================================

        dbPool =
            criarPool(
                conexao
            );


        await dbPool.query(
            "SELECT 1"
        );


        // ==================================================
        // CRIAR HISTÓRICO
        // ==================================================

        try {

            await criarExecucao(
                {

                    id:
                        job.id,

                    bancoDados:
                        conexao.database,

                    dataInicio:
                        job.inicio,

                    operacao:
                        "BACKUP",

                    quantidadeRetencao,

                    destinoPrincipal:
                        diretorioPrincipal,

                    destinoSecundario,

                    criptografado:
                        criptografar,

                    compactado:
                        compactar

                },
                dbPool
            );

        } catch (erro) {

            console.error(
                "Erro ao criar histórico:",
                erro.message
            );

        }


        await adicionarLog(
            job,
            "INICIANDO",
            `Processo iniciado. ID: ${job.id}`,
            "INFO",
            {
                banco:
                    conexao.database,

                host:
                    conexao.host
            },
            dbPool
        );


        // ==================================================
        // ETAPA 1 - VALIDAÇÃO
        // ==================================================

        atualizarJob(
            job.id,
            {

                status:
                    "EXECUTANDO",

                etapa:
                    "VALIDACAO",

                progresso:
                    10,

                mensagem:
                    "Validando configurações do processo..."

            }
        );


        await adicionarLog(
            job,
            "VALIDACAO",
            "Validando configurações do processo...",
            "INFO",
            null,
            dbPool
        );


        if (
            !diretorioPrincipal ||
            typeof diretorioPrincipal !==
            "string" ||
            diretorioPrincipal.trim() === ""
        ) {

            throw new Error(
                "O diretório principal é obrigatório."
            );

        }


        const quantidade =
            Number(
                quantidadeRetencao
            );


        if (
            !Number.isInteger(
                quantidade
            ) ||
            quantidade < 1
        ) {

            throw new Error(
                "A quantidade de backups deve ser um número inteiro maior que zero."
            );

        }


        if (
            !fs.existsSync(
                diretorioPrincipal
            )
        ) {

            fs.mkdirSync(
                diretorioPrincipal,
                {
                    recursive:
                        true
                }
            );

        }


        if (
            destinoSecundario &&
            destinoSecundario.trim() !== "" &&
            !fs.existsSync(
                destinoSecundario
            )
        ) {

            fs.mkdirSync(
                destinoSecundario,
                {
                    recursive:
                        true
                }
            );

        }


        await adicionarLog(
            job,
            "VALIDACAO",
            "Validação concluída com sucesso.",
            "INFO",
            null,
            dbPool
        );


        // ==================================================
        // ETAPA 2 - MANUTENÇÃO
        // ==================================================

        atualizarJob(
            job.id,
            {

                etapa:
                    "MANUTENCAO",

                progresso:
                    20,

                mensagem:
                    "Verificando necessidade de manutenção..."

            }
        );


        await adicionarLog(
            job,
            "MANUTENCAO",
            "Verificando necessidade de manutenção...",
            "INFO",
            null,
            dbPool
        );


        const ultimaManutencao =
            await buscarUltimaManutencao(
                dbPool
            );


        decisao =
            decidirManutencao(
                ultimaManutencao,
                forcarManutencao
            );


        await adicionarLog(
            job,
            "MANUTENCAO",
            `Decisão de manutenção: ${decisao.acao}.`,
            "INFO",
            {

                regra:
                    decisao.regra,

                acao:
                    decisao.acao,

                manual:
                    forcarManutencao

            },
            dbPool
        );


        resultadoManutencao =
            await executarManutencao(
                decisao.acao,
                dbPool
            );


        await registrarManutencao(
            {

                inicio:
                    resultadoManutencao.inicio ||
                    new Date(),

                fim:
                    resultadoManutencao.fim ||
                    new Date(),

                regra:
                    decisao.regra,

                status:
                    resultadoManutencao.sucesso
                        ? "SUCESSO"
                        : "FALHA",

                mensagem:
                    resultadoManutencao.mensagem

            },
            dbPool
        );


        await adicionarLog(
            job,
            "MANUTENCAO",
            resultadoManutencao.mensagem,
            resultadoManutencao.sucesso
                ? "INFO"
                : "ERROR",
            null,
            dbPool
        );


        if (
            !resultadoManutencao.sucesso
        ) {

            throw new Error(
                resultadoManutencao.mensagem ||
                "A manutenção falhou."
            );

        }


        // ==================================================
        // ETAPA 3 - BACKUP
        // ==================================================

        atualizarJob(
            job.id,
            {

                etapa:
                    "BACKUP",

                progresso:
                    40,

                mensagem:
                    "Gerando backup do banco de dados..."

            }
        );


        await adicionarLog(
            job,
            "BACKUP",
            "Gerando backup do banco de dados...",
            "INFO",
            null,
            dbPool
        );


        resultadoBackup =
            await criarBackup(
                conexao,
                diretorioPrincipal
            );


        await registrarBackup(
            dbPool,
            resultadoBackup
        );


        arquivoAtual =
            resultadoBackup.caminho;


        await adicionarLog(
            job,
            "BACKUP",
            "Backup do banco de dados gerado com sucesso.",
            "INFO",
            {

                arquivo:
                    resultadoBackup.arquivo,

                tamanho:
                    resultadoBackup.tamanho

            },
            dbPool
        );


        // ==================================================
        // ETAPA 4 - AES
        // ==================================================

        if (
            criptografar
        ) {

            atualizarJob(
                job.id,
                {

                    etapa:
                        "CRIPTOGRAFIA",

                    progresso:
                        55,

                    mensagem:
                        "Criptografando o backup com AES..."

                }
            );


            await adicionarLog(
                job,
                "CRIPTOGRAFIA",
                "Criptografando o backup com AES...",
                "INFO",
                null,
                dbPool
            );

            const resultadoAES =
                await criptografarAES(
                    arquivoAtual
                );

            arquivoAtual =
                resultadoAES.caminho;

            chaveAesProtegida =
                protegerSegredo(
                    resultadoAES.chave
                );

            ivAesProtegido =
                protegerSegredo(
                    resultadoAES.iv
                );


            await adicionarLog(
                job,
                "CRIPTOGRAFIA",
                "Criptografia AES concluída.",
                "INFO",
                null,
                dbPool
            );

        }


        // ==================================================
        // ETAPA 5 - ZIP
        // ==================================================

        if (
            compactar
        ) {

            atualizarJob(
                job.id,
                {

                    etapa:
                        "COMPACTACAO",

                    progresso:
                        70,

                    mensagem:
                        "Compactando o backup..."

                }
            );


            await adicionarLog(
                job,
                "COMPACTACAO",
                "Compactando o backup com proteção por senha...",
                "INFO",
                null,
                dbPool
            );


            const resultadoZIP =
                await compactarZIP(
                    arquivoAtual,
                    process.env.ZIP_PASSWORD
                );


            arquivoAtual =
                resultadoZIP.caminho;


            await adicionarLog(
                job,
                "COMPACTACAO",
                "Compactação ZIP concluída.",
                "INFO",
                null,
                dbPool
            );

        }


        // ==================================================
        // ETAPA 6 - DESTINO PRINCIPAL
        // ==================================================

        atualizarJob(
            job.id,
            {

                etapa:
                    "COPIA_PRINCIPAL",

                progresso:
                    80,

                mensagem:
                    "Copiando backup para o diretório principal..."

            }
        );


        const resultadoDestinoPrincipal =
            await copiarParaDestino(
                arquivoAtual,
                diretorioPrincipal
            );


        await adicionarLog(
            job,
            "COPIA_PRINCIPAL",
            "Backup copiado para o diretório principal.",
            "INFO",
            null,
            dbPool
        );


        // ==================================================
        // ETAPA 7 - DESTINO SECUNDÁRIO
        // ==================================================

        if (
            destinoSecundario &&
            destinoSecundario.trim() !== ""
        ) {

            atualizarJob(
                job.id,
                {

                    etapa:
                        "COPIA_SECUNDARIA",

                    progresso:
                        90,

                    mensagem:
                        "Copiando backup para o destino secundário..."

                }
            );


            resultadoCopia =
                await copiarParaDestino(
                    arquivoAtual,
                    destinoSecundario
                );


            await adicionarLog(
                job,
                "COPIA_SECUNDARIA",
                "Cópia para o destino secundário concluída.",
                "INFO",
                null,
                dbPool
            );

        }


        // ==================================================
        // ETAPA 8 - RETENÇÃO
        // ==================================================

        atualizarJob(
            job.id,
            {

                etapa:
                    "RETENCAO",

                progresso:
                    95,

                mensagem:
                    "Aplicando política de retenção..."

            }
        );


        resultadoRetencao =
            aplicarRetencao(
                diretorioPrincipal,
                quantidade
            );


        await adicionarLog(
            job,
            "RETENCAO",
            `Política de retenção aplicada. Mantendo os últimos ${quantidade} backups.`,
            "INFO",
            {

                mantidos:
                    resultadoRetencao?.mantidos?.length ||
                    0,

                removidos:
                    resultadoRetencao?.removidos?.length ||
                    0

            },
            dbPool
        );


        // ==================================================
        // FINALIZAR
        // ==================================================

        const fim =
            new Date();


        atualizarJob(
            job.id,
            {

                status:
                    "CONCLUIDO",

                etapa:
                    "FINALIZADO",

                progresso:
                    100,

                mensagem:
                    "Backup concluído com sucesso.",

                fim,

                resultado: {

                    backup: {

                        arquivo:
                            resultadoBackup.arquivo,

                        tamanho:
                            resultadoBackup.tamanho

                    },

                    arquivoFinal:
                        arquivoAtual,

                    manutencao: {

                        decisao,

                        resultado:
                            resultadoManutencao

                    },

                    destinoPrincipal:
                        resultadoDestinoPrincipal,

                    destinoSecundario:
                        resultadoCopia,

                    retencao:
                        resultadoRetencao

                }

            }
        );


        await adicionarLog(
            job,
            "FINALIZADO",
            "Backup concluído com sucesso.",
            "INFO",
            null,
            dbPool
        );


        try {

            await finalizarExecucao(
                {
                    id:
                        job.id,

                    dataFim:
                        fim,

                    status:
                        "SUCESSO",

                    mensagem:
                        "Backup concluído com sucesso.",

                    regraManutencao:
                        decisao?.regra ||
                        null,

                    manutencaoStatus:
                        resultadoManutencao?.sucesso
                            ? "SUCESSO"
                            : "FALHA",

                    arquivoBackup:
                        arquivoAtual,

                    chaveAes:
                        chaveAesProtegida,

                    ivAes:
                        ivAesProtegido
                },
                dbPool
            );

        } catch (erro) {

            console.error(
                "Erro ao finalizar histórico:",
                erro.message
            );

        }

    } catch (erro) {

        console.error(
            "Erro no job de backup:",
            erro.message
        );


        const fim =
            new Date();


        await adicionarLog(
            job,
            "ERRO",
            `Processo interrompido: ${erro.message}`,
            "ERROR",
            null,
            dbPool
        );


        atualizarJob(
            job.id,
            {

                status:
                    "FALHA",

                etapa:
                    "ERRO",

                progresso:
                    100,

                mensagem:
                    "O processo de backup falhou.",

                erro:
                    erro.message,

                fim

            }
        );


        if (dbPool) {

            try {

                await finalizarExecucao(
                    {
                        id:
                            job.id,

                        dataFim:
                            fim,

                        status:
                            "SUCESSO",

                        mensagem:
                            "Backup concluído com sucesso.",

                        regraManutencao:
                            decisao?.regra ||
                            null,

                        manutencaoStatus:
                            resultadoManutencao?.sucesso
                                ? "SUCESSO"
                                : "FALHA",

                        arquivoBackup:
                            arquivoAtual,

                        chaveAes:
                            chaveAesProtegida,

                        ivAes:
                            ivAesProtegido
                    },
                    dbPool
                );

            } catch (erro) {

                console.error(
                    "Erro no job de backup:",
                    erro.message
                );


                const fim =
                    new Date();


                await adicionarLog(
                    job,
                    "ERRO",
                    `Processo interrompido: ${erro.message}`,
                    "ERROR",
                    null,
                    dbPool
                );


                atualizarJob(
                    job.id,
                    {
                        status:
                            "FALHA",

                        etapa:
                            "ERRO",

                        progresso:
                            0,

                        mensagem:
                            "O processo de backup falhou.",

                        erro:
                            erro.message,

                        fim
                    }
                );


                try {

                    await finalizarExecucao(
                        {
                            id:
                                job.id,

                            dataFim:
                                fim,

                            status:
                                "SUCESSO",

                            mensagem:
                                "Backup concluído com sucesso.",

                            regraManutencao:
                                decisao?.regra ||
                                null,

                            manutencaoStatus:
                                resultadoManutencao?.sucesso
                                    ? "SUCESSO"
                                    : "FALHA",

                            arquivoBackup:
                                arquivoAtual,

                            chaveAes:
                                chaveAesProtegida,

                            ivAes:
                                ivAesProtegido
                        },
                        dbPool
                    );

                } catch (logErro) {

                    console.error(
                        "Erro ao finalizar histórico:",
                        logErro.message
                    );

                }

            }

        }

    }

}


// ======================================================
// INICIAR BACKUP
// ======================================================

function iniciarBackup(
    opcoes
) {

    const job =
        criarJob();


    executarBackup(
        job,
        opcoes
    );


    return job;

}


module.exports = {

    iniciarBackup,

    obterJob

};