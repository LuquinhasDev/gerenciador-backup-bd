const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

require("dotenv").config();


// ======================================================
// AES
// ======================================================

function gerarChaveAES() {

    return crypto.randomBytes(32);

}


async function criptografarAES(caminhoArquivo) {

    return new Promise((resolve, reject) => {

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


        saida.on("finish", () => {

            resolve({

                caminho:
                    caminhoCriptografado,

                chave:
                    chave.toString("hex"),

                iv:
                    iv.toString("hex")

            });

        });


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

    });

}


// ======================================================
// ZIP
// ======================================================

async function compactarZIP(
    caminhoArquivo,
    usarSenha = false
) {

    return new Promise((resolve, reject) => {

        const caminhoZIP =
            `${caminhoArquivo}.zip`;


        const saida =
            fs.createWriteStream(
                caminhoZIP
            );


        let archive;


        /*
         * ZIP COM SENHA
         */

        if (usarSenha) {

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
                            process.env.ZIP_PASSWORD

                    }
                );

        }

        /*
         * ZIP NORMAL
         */

        else {

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


        /*
         * Quando terminar
         */

        saida.on("close", () => {

            resolve({

                caminho:
                    caminhoZIP,

                tamanho:
                    archive.pointer(),

                criptografado:
                    usarSenha

            });

        });


        archive.on(
            "error",
            reject
        );


        saida.on(
            "error",
            reject
        );


        /*
         * Conecta o archive
         * ao arquivo de saída
         */

        archive.pipe(
            saida
        );


        /*
         * Adiciona o backup
         * dentro do ZIP
         */

        archive.file(
            caminhoArquivo,
            {

                name:
                    path.basename(
                        caminhoArquivo
                    )

            }
        );


        /*
         * Finaliza
         */

        archive.finalize();

    });

}


module.exports = {

    criptografarAES,

    compactarZIP

};