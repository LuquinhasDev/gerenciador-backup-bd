// fileService.js

const fs =
    require("fs");

const path =
    require("path");


// ======================================================
// LISTAR BACKUPS
// ======================================================

function listarBackups(
    pasta
) {

    if (
        !fs.existsSync(
            pasta
        )
    ) {

        return [];

    }


    return fs
        .readdirSync(
            pasta
        )

        .filter(
            nome => {

                return (
                    nome.startsWith(
                        "backup_"
                    ) &&
                    (
                        nome.endsWith(
                            ".dump"
                        ) ||
                        nome.endsWith(
                            ".dump.enc"
                        ) ||
                        nome.endsWith(
                            ".dump.zip"
                        ) ||
                        nome.endsWith(
                            ".dump.enc.zip"
                        )
                    )
                );

            }
        )

        .map(
            nome => {

                const caminho =
                    path.join(
                        pasta,
                        nome
                    );

                const stats =
                    fs.statSync(
                        caminho
                    );


                return {

                    nome,

                    caminho,

                    data:
                        stats.mtime.getTime()

                };

            }
        )

        .sort(
            (a, b) =>
                b.data -
                a.data
        );

}


// ======================================================
// APLICAR RETENÇÃO
// ======================================================

function aplicarRetencao(
    pasta,
    quantidadeManter
) {

    if (
        quantidadeManter ===
            undefined ||
        quantidadeManter ===
            null ||
        quantidadeManter ===
            ""
    ) {

        return {

            mantidos: [],
            removidos: []

        };

    }


    const quantidade =
        Number(
            quantidadeManter
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


    const backups =
        listarBackups(
            pasta
        );


    const manter =
        backups.slice(
            0,
            quantidade
        );


    const remover =
        backups.slice(
            quantidade
        );


    for (
        const backup
        of remover
    ) {

        fs.rmSync(
            backup.caminho,
            {
                force: true
            }
        );

    }


    return {

        mantidos:
            manter.map(
                backup =>
                    backup.nome
            ),

        removidos:
            remover.map(
                backup =>
                    backup.nome
            )

    };

}


// ======================================================
// COPIAR PARA DESTINO
// ======================================================

async function copiarParaDestino(
    caminhoArquivo,
    destino
) {

    if (!destino) {

        return {

            copiado:
                false,

            motivo:
                "Destino adicional não informado."

        };

    }


    if (
        !fs.existsSync(
            destino
        )
    ) {

        fs.mkdirSync(
            destino,
            {
                recursive:
                    true
            }
        );

    }


    const nomeArquivo =
        path.basename(
            caminhoArquivo
        );


    const destinoFinal =
        path.join(
            destino,
            nomeArquivo
        );


    await fs.promises.copyFile(
        caminhoArquivo,
        destinoFinal
    );


    return {

        copiado:
            true,

        origem:
            caminhoArquivo,

        destino:
            destinoFinal

    };

}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    listarBackups,

    aplicarRetencao,

    copiarParaDestino

};