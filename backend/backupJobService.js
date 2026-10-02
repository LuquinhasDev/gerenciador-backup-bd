const crypto = require("crypto");
const fs = require("fs");

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
    compactarZIP
} = require("./securityService");

const {
    aplicarRetencao,
    copiarParaDestino
} = require("./fileService");


const jobs = new Map();


// ======================================================
// CRIAR JOB
// ======================================================

function criarJob() {

    const id =
        crypto.randomUUID();

    const job = {

        id,

        status: "INICIANDO",

        etapa: "INICIANDO",

        progresso: 0,

        mensagem:
            "Preparando processo de backup...",

        inicio:
            new Date(),

        fim: null,

        erro: null,

        resultado: null,

        logs: []

    };


    jobs.set(
        id,
        job
    );


    adicionarLog(
        id,
        "Processo de backup criado."
    );


    return job;
}


// ======================================================
// ADICIONAR LOG
// ======================================================

function adicionarLog(
    id,
    mensagem
) {

    const job =
        jobs.get(id);

    if (!job) {
        return;
    }


    job.logs.push({

        horario:
            new Date(),

        mensagem

    });

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


    if (dados.mensagem) {

        adicionarLog(
            id,
            dados.mensagem
        );

    }

}


// ======================================================
// OBTER JOB
// ======================================================

function obterJob(
    id
) {

    return jobs.get(id);

}


// ======================================================
// EXECUTAR BACKUP
// ======================================================

async function executarBackup(
    job,
    opcoes = {}
) {

    try {

        const {

            forcarManutencao = false,

            criptografar = false,

            compactar = false,

            quantidadeRetencao = 5,

            destinoSecundario = null,

            diretorioPrincipal = null

        } = opcoes;


        // ==================================================
        // ETAPA 1 - VALIDAÇÃO
        // ==================================================

        atualizarJob(
            job.id,
            {

                status: "EXECUTANDO",

                etapa: "VALIDACAO",

                progresso: 10,

                mensagem:
                    "Validando configurações do processo..."

            }
        );


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
            !diretorioPrincipal
        ) {

            throw new Error(
                "O diretório principal é obrigatório."
            );

        }


        // Cria diretório principal

        if (
            !fs.existsSync(
                diretorioPrincipal
            )
        ) {

            fs.mkdirSync(
                diretorioPrincipal,
                {
                    recursive: true
                }
            );

        }


        // Cria diretório secundário

        if (
            destinoSecundario &&
            !fs.existsSync(
                destinoSecundario
            )
        ) {

            fs.mkdirSync(
                destinoSecundario,
                {
                    recursive: true
                }
            );

        }


        // ==================================================
        // ETAPA 2 - MANUTENÇÃO
        // ==================================================

        atualizarJob(
            job.id,
            {

                etapa: "MANUTENCAO",

                progresso: 20,

                mensagem:
                    "Verificando necessidade de manutenção..."

            }
        );


        const ultimaManutencao =
            await buscarUltimaManutencao();


        const decisao =
            decidirManutencao(
                ultimaManutencao,
                forcarManutencao
            );


        atualizarJob(
            job.id,
            {

                mensagem:
                    `Executando manutenção: ${decisao.acao}`

            }
        );


        const resultadoManutencao =
            await executarManutencao(
                decisao.acao
            );


        await registrarManutencao({

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

        });


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

                etapa: "BACKUP",

                progresso: 40,

                mensagem:
                    "Gerando backup do banco de dados..."

            }
        );


        const resultadoBackup =
            await criarBackup(
                diretorioPrincipal
            );


        await registrarBackup(
            resultadoBackup
        );


        let arquivoAtual =
            resultadoBackup.caminho;


        // ==================================================
        // ETAPA 4 - AES
        // ==================================================

        if (criptografar) {

            atualizarJob(
                job.id,
                {

                    etapa: "CRIPTOGRAFIA",

                    progresso: 55,

                    mensagem:
                        "Criptografando o backup com AES..."

                }
            );


            const resultadoAES =
                await criptografarAES(
                    arquivoAtual
                );


            arquivoAtual =
                resultadoAES.caminho;

        }


        // ==================================================
        // ETAPA 5 - ZIP
        // ==================================================

        if (compactar) {

            atualizarJob(
                job.id,
                {

                    etapa: "COMPACTACAO",

                    progresso: 70,

                    mensagem:
                        "Compactando o backup..."

                }
            );


            const resultadoZIP =
                await compactarZIP(
                    arquivoAtual
                );


            arquivoAtual =
                resultadoZIP.caminho;

        }


        // ==================================================
        // ETAPA 6 - CÓPIA PRINCIPAL
        // ==================================================

        atualizarJob(
            job.id,
            {

                etapa: "COPIA_PRINCIPAL",

                progresso: 80,

                mensagem:
                    "Copiando backup para o diretório principal..."

            }
        );


        const resultadoDestinoPrincipal =
            await copiarParaDestino(
                arquivoAtual,
                diretorioPrincipal
            );


        // ==================================================
        // ETAPA 7 - CÓPIA SECUNDÁRIA
        // ==================================================

        let resultadoDestinoSecundario =
            null;


        if (
            destinoSecundario
        ) {

            atualizarJob(
                job.id,
                {

                    etapa: "COPIA_SECUNDARIA",

                    progresso: 88,

                    mensagem:
                        "Copiando backup para o destino secundário..."

                }
            );


            resultadoDestinoSecundario =
                await copiarParaDestino(
                    arquivoAtual,
                    destinoSecundario
                );

        }


        // ==================================================
        // ETAPA 8 - RETENÇÃO
        // ==================================================

        atualizarJob(
            job.id,
            {

                etapa: "RETENCAO",

                progresso: 95,

                mensagem:
                    "Aplicando política de retenção..."

            }
        );


        const resultadoRetencao =
            aplicarRetencao(
                diretorioPrincipal,
                quantidade
            );


        // ==================================================
        // FINALIZAÇÃO
        // ==================================================

        atualizarJob(
            job.id,
            {

                status: "CONCLUIDO",

                etapa: "FINALIZADO",

                progresso: 100,

                mensagem:
                    "Backup concluído com sucesso.",

                fim:
                    new Date(),

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
                        resultadoDestinoSecundario,

                    retencao:
                        resultadoRetencao

                }

            }
        );


    } catch (erro) {

        console.error(
            "Erro no job de backup:",
            erro.message
        );


        atualizarJob(
            job.id,
            {

                status: "FALHA",

                etapa: "ERRO",

                progresso: 100,

                mensagem:
                    "O processo de backup falhou.",

                erro:
                    erro.message,

                fim:
                    new Date()

            }
        );

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


    return {

        jobId:
            job.id

    };

}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    iniciarBackup,

    obterJob

};