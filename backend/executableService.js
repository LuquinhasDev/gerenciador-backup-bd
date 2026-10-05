// ======================================================
// EXECUTABLE SERVICE
// ======================================================

const fs = require("fs");
const path = require("path");

require("dotenv").config();


// ======================================================
// VERIFICAR ARQUIVO
// ======================================================

function arquivoExiste(caminho) {

    if (!caminho) {
        return false;
    }

    try {

        return fs.existsSync(caminho);

    } catch (_) {

        return false;

    }

}


// ======================================================
// NORMALIZAR CAMINHO
// ======================================================

function normalizarCaminho(caminho) {

    if (!caminho) {
        return null;
    }

    return path.normalize(
        caminho.trim()
    );

}


// ======================================================
// PROCURAR PRIMEIRO CAMINHO VÁLIDO
// ======================================================

function encontrarPrimeiro(caminhos) {

    for (const caminho of caminhos) {

        const caminhoNormalizado =
            normalizarCaminho(caminho);

        if (
            caminhoNormalizado &&
            arquivoExiste(caminhoNormalizado)
        ) {

            return caminhoNormalizado;

        }

    }

    return null;

}


// ======================================================
// ENCONTRAR POSTGRESQL
// ======================================================

function encontrarPostgreSQL() {

    const caminhos = [];

    // --------------------------------------------------
    // Caminho definido manualmente no .env
    // --------------------------------------------------

    if (process.env.PG_BIN) {

        caminhos.push(
            path.join(
                process.env.PG_BIN,
                "pg_dump.exe"
            )
        );

    }


    // --------------------------------------------------
    // PostgreSQL instalado em Program Files
    // --------------------------------------------------

    const pastasPostgreSQL = [

        "C:\\Program Files\\PostgreSQL",

        "C:\\Program Files (x86)\\PostgreSQL"

    ];


    for (
        const pastaBase
        of pastasPostgreSQL
    ) {

        if (
            !fs.existsSync(
                pastaBase
            )
        ) {

            continue;

        }


        let versoes = [];


        try {

            versoes =
                fs.readdirSync(
                    pastaBase,
                    {
                        withFileTypes:
                            true
                    }
                )

                .filter(
                    item =>
                        item.isDirectory()
                )

                .map(
                    item =>
                        item.name
                )

                .sort(
                    (a, b) =>
                        Number(b) -
                        Number(a)
                );

        } catch (_) {

            continue;

        }


        for (
            const versao
            of versoes
        ) {

            caminhos.push(
                path.join(
                    pastaBase,
                    versao,
                    "bin",
                    "pg_dump.exe"
                )
            );

        }

    }


    const pgDump =
        encontrarPrimeiro(
            caminhos
        );


    if (!pgDump) {

        throw new Error(
            [
                "pg_dump.exe não foi encontrado.",
                "",
                "Instale o PostgreSQL ou configure",
                "PG_BIN no arquivo .env.",
                "",
                "Exemplo:",
                "PG_BIN=C:\\Program Files\\PostgreSQL\\17\\bin"
            ].join("\n")
        );

    }


    const pastaBin =
        path.dirname(
            pgDump
        );


    const pgRestore =
        path.join(
            pastaBin,
            "pg_restore.exe"
        );


    if (
        !arquivoExiste(
            pgRestore
        )
    ) {

        throw new Error(
            `pg_restore.exe não foi encontrado em:\n${pastaBin}`
        );

    }


    return {

        bin:
            pastaBin,

        pgDump,

        pgRestore

    };

}


// ======================================================
// ENCONTRAR 7-ZIP
// ======================================================

function encontrar7Zip() {

    const caminhos = [

        // .env
        process.env.SEVEN_ZIP_PATH,

        // Instalação normal
        "C:\\Program Files\\7-Zip\\7z.exe",

        // Instalação 32 bits
        "C:\\Program Files (x86)\\7-Zip\\7z.exe"

    ];


    const sevenZip =
        encontrarPrimeiro(
            caminhos
        );


    if (!sevenZip) {

        throw new Error(
            [
                "7z.exe não foi encontrado.",
                "",
                "Instale o 7-Zip ou configure",
                "SEVEN_ZIP_PATH no arquivo .env.",
                "",
                "Exemplo:",
                "SEVEN_ZIP_PATH=C:\\Program Files\\7-Zip\\7z.exe"
            ].join("\n")
        );

    }


    return sevenZip;

}


// ======================================================
// PG_DUMP
// ======================================================

function obterPgDump() {

    return encontrarPostgreSQL().pgDump;

}


// ======================================================
// PG_RESTORE
// ======================================================

function obterPgRestore() {

    return encontrarPostgreSQL().pgRestore;

}


// ======================================================
// 7-ZIP
// ======================================================

function obter7Zip() {

    return encontrar7Zip();

}


// ======================================================
// OBTER TODOS OS EXECUTÁVEIS
// ======================================================

function obterExecutaveis() {

    const postgres =
        encontrarPostgreSQL();

    const sevenZip =
        encontrar7Zip();


    return {

        pgDump:
            postgres.pgDump,

        pgRestore:
            postgres.pgRestore,

        sevenZip

    };

}


// ======================================================
// TESTAR CONFIGURAÇÃO
// ======================================================

function testarExecutaveis() {

    const executaveis =
        obterExecutaveis();


    return {

        sucesso:
            true,

        ...executaveis

    };

}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    obterPgDump,

    obterPgRestore,

    obter7Zip,

    obterExecutaveis,

    testarExecutaveis

};