const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

require("dotenv").config();


// ======================================================
// REGISTRAR ZIP COM SENHA
// ======================================================

archiver.registerFormat(
    "zip-encrypted",
    require("archiver-zip-encrypted")
);


// ======================================================
// CHAVE MASTER
// ======================================================

function obterChaveMaster() {

    const chave =
        process.env.BACKUP_MASTER_KEY;

    if (
        !chave ||
        !/^[0-9a-fA-F]{64}$/.test(chave)
    ) {

        throw new Error(
            "BACKUP_MASTER_KEY deve conter 64 caracteres hexadecimais."
        );

    }

    return Buffer.from(
        chave,
        "hex"
    );

}


// ======================================================
// PROTEGER CHAVE AES
// ======================================================

function protegerSegredo(segredo) {

    const chaveMaster =
        obterChaveMaster();

    const iv =
        crypto.randomBytes(12);

    const cipher =
        crypto.createCipheriv(
            "aes-256-gcm",
            chaveMaster,
            iv
        );

    const texto =
        cipher.update(
            String(segredo),
            "utf8",
            "hex"
        ) +
        cipher.final("hex");

    const tag =
        cipher.getAuthTag();

    return [
        iv.toString("hex"),
        tag.toString("hex"),
        texto
    ].join(":");

}


// ======================================================
// DESPROTEGER CHAVE AES
// ======================================================

function desprotegerSegredo(valor) {

    if (!valor) {

        throw new Error(
            "Segredo criptografado não informado."
        );

    }

    const partes =
        String(valor).split(":");


    if (partes.length !== 3) {

        throw new Error(
            "Formato inválido do segredo criptografado."
        );

    }


    const [
        ivHex,
        tagHex,
        textoHex
    ] = partes;


    const chaveMaster =
        obterChaveMaster();

    const decipher =
        crypto.createDecipheriv(
            "aes-256-gcm",
            chaveMaster,
            Buffer.from(
                ivHex,
                "hex"
            )
        );

    decipher.setAuthTag(
        Buffer.from(
            tagHex,
            "hex"
        )
    );


    return (
        decipher.update(
            textoHex,
            "hex",
            "utf8"
        ) +
        decipher.final("utf8")
    );

}


// ======================================================
// AES
// ======================================================

function gerarChaveAES() {

    return crypto.randomBytes(32);

}


async function criptografarAES(
    caminhoArquivo
) {

    return new Promise(
        (resolve, reject) => {

            const chave =
                gerarChaveAES();

            const iv =
                crypto.randomBytes(16);

            const caminhoCriptografado =
                `${caminhoArquivo}.enc`;

            const cipher =
                crypto.createCipheriv(
                    "aes-256-cbc",
                    chave,
                    iv
                );

            const entrada =
                fs.createReadStream(
                    caminhoArquivo
                );

            const saida =
                fs.createWriteStream(
                    caminhoCriptografado
                );


            entrada
                .pipe(cipher)
                .pipe(saida);


            saida.on(
                "finish",
                () => {

                    resolve({

                        caminho:
                            caminhoCriptografado,

                        chave:
                            chave.toString("hex"),

                        iv:
                            iv.toString("hex")

                    });

                }
            );


            entrada.on(
                "error",
                reject
            );

            cipher.on(
                "error",
                reject
            );

            saida.on(
                "error",
                reject
            );

        }
    );

}


// ======================================================
// DESCRIPTROGRAFAR AES
// ======================================================

async function descriptografarAES({

    caminhoArquivo,
    chave,
    iv,
    caminhoSaida

}) {

    return new Promise(
        (resolve, reject) => {

            if (!chave || !iv) {

                reject(
                    new Error(
                        "Chave AES ou IV não informado."
                    )
                );

                return;

            }


            const decipher =
                crypto.createDecipheriv(
                    "aes-256-cbc",
                    Buffer.from(
                        chave,
                        "hex"
                    ),
                    Buffer.from(
                        iv,
                        "hex"
                    )
                );


            const entrada =
                fs.createReadStream(
                    caminhoArquivo
                );

            const saida =
                fs.createWriteStream(
                    caminhoSaida
                );


            entrada
                .pipe(decipher)
                .pipe(saida);


            entrada.on(
                "error",
                reject
            );

            decipher.on(
                "error",
                reject
            );

            saida.on(
                "error",
                reject
            );


            saida.on(
                "finish",
                () => {

                    resolve({

                        caminho:
                            caminhoSaida

                    });

                }
            );

        }
    );

}


// ======================================================
// ZIP
// ======================================================

async function compactarZIP(
    caminhoArquivo,
    usarSenha = false
) {

    return new Promise(
        (resolve, reject) => {

            const caminhoZIP =
                `${caminhoArquivo}.zip`;


            const saida =
                fs.createWriteStream(
                    caminhoZIP
                );


            let archive;


            if (usarSenha) {

                const senha =
                    process.env.ZIP_PASSWORD;


                if (!senha) {

                    reject(
                        new Error(
                            "ZIP_PASSWORD não foi configurada no arquivo .env."
                        )
                    );

                    return;

                }


                archive =
                    archiver.create(
                        "zip-encrypted",
                        {

                            zlib: {
                                level: 8
                            },

                            encryptionMethod:
                                "aes256",

                            password:
                                senha

                        }
                    );

            } else {

                archive =
                    archiver(
                        "zip",
                        {

                            zlib: {
                                level: 8
                            }

                        }
                    );

            }


            archive.on(
                "error",
                reject
            );

            saida.on(
                "error",
                reject
            );


            saida.on(
                "close",
                () => {

                    resolve({

                        caminho:
                            caminhoZIP,

                        tamanho:
                            archive.pointer(),

                        criptografado:
                            usarSenha

                    });

                }
            );


            archive.pipe(
                saida
            );


            archive.file(
                caminhoArquivo,
                {

                    name:
                        path.basename(
                            caminhoArquivo
                        )

                }
            );


            archive.finalize();

        }
    );

}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    criptografarAES,

    descriptografarAES,

    compactarZIP,

    protegerSegredo,

    desprotegerSegredo

};