const API_URL = "http://localhost:3000";


// =========================================================
// ELEMENTOS
// =========================================================

const navItems =
    document.querySelectorAll(".nav-item");

const sections =
    document.querySelectorAll(".page-section");

const pageTitle =
    document.getElementById("pageTitle");

const pageDescription =
    document.getElementById("pageDescription");

const testConnectionButton =
    document.getElementById("testConnection");

const connectionStatus =
    document.getElementById("connectionStatus");

const sidebarConnectionDot =
    document.getElementById("sidebarConnectionDot");

const sidebarConnectionText =
    document.getElementById("sidebarConnectionText");

const systemStatusDot =
    document.getElementById("systemStatusDot");

const systemStatusText =
    document.getElementById("systemStatusText");

const startBackupButton =
    document.getElementById("startBackup");

const message =
    document.getElementById("message");

const confirmationModal =
    document.getElementById("confirmationModal");

const cancelBackupButton =
    document.getElementById("cancelBackup");

const confirmBackupButton =
    document.getElementById("confirmBackup");

const togglePasswordButton =
    document.getElementById("togglePassword");

const dbPassword =
    document.getElementById("dbPassword");

const refreshHistoryButton =
    document.getElementById("refreshHistory");

const logModal =
    document.getElementById("logModal");

const closeLogModal =
    document.getElementById("closeLogModal");

const logDetails =
    document.getElementById("logDetails");

const liveLog =
    document.getElementById("liveLog");

const progressBar =
    document.getElementById(
        "progressBar"
    );

const progressPercent =
    document.getElementById(
        "progressPercent"
    );

const progressText =
    document.getElementById(
        "progressText"
    );

const processStatusBadge =
    document.getElementById(
        "processStatusBadge"
    );

// =========================================================
// CONTROLE DO JOB
// =========================================================

let currentJobId = null;

let polling = false;

let lastJobMessage = null;

let lastJobStage = null;


// =========================================================
// NAVEGAÇÃO
// =========================================================

const sectionInformation = {

    configuracao: {
        title: "Configuração",
        description:
            "Configure a conexão e os parâmetros do processo de backup."
    },

    processo: {
        title: "Processo de backup",
        description:
            "Acompanhe as etapas e o estado da execução."
    },

    historico: {
        title: "Histórico",
        description:
            "Consulte as execuções realizadas pela plataforma."
    }

};


navItems.forEach((item) => {

    item.addEventListener("click", () => {

        const target =
            item.dataset.section;

        navItems.forEach((nav) => {

            nav.classList.remove("active");

        });

        item.classList.add("active");


        sections.forEach((section) => {

            section.classList.remove(
                "active-section"
            );

        });


        const selectedSection =
            document.getElementById(target);

        if (selectedSection) {

            selectedSection.classList.add(
                "active-section"
            );

        }


        const information =
            sectionInformation[target];

        if (information) {

            pageTitle.textContent =
                information.title;

            pageDescription.textContent =
                information.description;

        }

    });

});


// =========================================================
// SENHA
// =========================================================

togglePasswordButton.addEventListener(
    "click",
    () => {

        const showing =
            dbPassword.type === "text";

        if (showing) {

            dbPassword.type = "password";

            togglePasswordButton.textContent =
                "Mostrar";

        } else {

            dbPassword.type = "text";

            togglePasswordButton.textContent =
                "Ocultar";

        }

    }
);


// =========================================================
// TESTAR CONEXÃO
// =========================================================

testConnectionButton.addEventListener(
    "click",
    async (event) => {

        event.preventDefault();

        setConnectionStatus(
            "Testando conexão...",
            "loading"
        );

        testConnectionButton.disabled =
            true;


        try {

            const response =
                await fetch(
                    `${API_URL}/api/veiculos`
                );


            if (!response.ok) {

                throw new Error(
                    "O servidor retornou um erro."
                );

            }


            const vehicles =
                await response.json();


            setConnectionStatus(
                `✓ Conexão realizada com sucesso. ${vehicles.length} registros encontrados.`,
                "success"
            );


            setSystemConnection(true);


            addLog(
                `Conexão estabelecida. ${vehicles.length} registros encontrados.`
            );


        } catch (error) {

            console.error(error);


            setConnectionStatus(
                "✗ Não foi possível conectar ao banco de dados.",
                "error"
            );


            setSystemConnection(false);


            addLog(
                "Falha ao testar a conexão com o banco."
            );

        } finally {

            testConnectionButton.disabled =
                false;

        }

    }
);


// =========================================================
// STATUS DA CONEXÃO
// =========================================================

function setConnectionStatus(
    text,
    type
) {

    connectionStatus.textContent =
        text;

    connectionStatus.className =
        `inline-status ${type}`;

}


function setSystemConnection(
    connected
) {

    if (connected) {

        sidebarConnectionDot.className =
            "status-dot online";

        sidebarConnectionText.textContent =
            "Conectado";


        systemStatusDot.className =
            "status-dot online";

        systemStatusText.textContent =
            "Banco conectado";

    } else {

        sidebarConnectionDot.className =
            "status-dot error";

        sidebarConnectionText.textContent =
            "Erro na conexão";


        systemStatusDot.className =
            "status-dot error";

        systemStatusText.textContent =
            "Banco indisponível";

    }

}


// =========================================================
// INICIAR BACKUP
// =========================================================

startBackupButton.addEventListener(
    "click",
    (event) => {

        event.preventDefault();

        clearMessage();


        const database =
            document.getElementById(
                "database"
            ).value.trim();

        const mainPath =
            document.getElementById(
                "mainPath"
            ).value.trim();

        const retention =
            document.getElementById(
                "retention"
            ).value;


        if (!database) {

            showMessage(
                "Informe o nome do banco de dados.",
                "error"
            );

            return;

        }


        if (!mainPath) {

            showMessage(
                "Informe o diretório principal do backup.",
                "error"
            );

            return;

        }


        if (
            !retention ||
            Number(retention) < 1
        ) {

            showMessage(
                "Informe uma quantidade válida de backups para retenção.",
                "error"
            );

            return;

        }


        document.getElementById(
            "confirmDatabase"
        ).textContent =
            database;


        document.getElementById(
            "confirmDestination"
        ).textContent =
            mainPath;


        document.getElementById(
            "confirmRetention"
        ).textContent =
            `${retention} backups`;


        openModal(
            confirmationModal
        );

    }
);


// =========================================================
// CANCELAR CONFIRMAÇÃO
// =========================================================

cancelBackupButton.addEventListener(
    "click",
    () => {

        closeModal(
            confirmationModal
        );

    }
);


// =========================================================
// CONFIRMAR E INICIAR BACKUP REAL
// =========================================================

confirmBackupButton.addEventListener(
    "click",
    async () => {

        closeModal(
            confirmationModal
        );


        navigateTo(
            "processo"
        );


        resetProcess();


        setProcessStatus(
            "running",
            "Iniciando"
        );


        addLog(
            "Enviando solicitação de backup para o servidor..."
        );


        try {

            const response =
                await fetch(
                    `${API_URL}/api/backup`,
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                diretorioPrincipal:
                                    document.getElementById(
                                        "mainPath"
                                    ).value.trim(),

                                diretorioSecundario:
                                    document.getElementById(
                                        "secondaryPath"
                                    ).value.trim(),

                                criptografar:
                                    document.getElementById(
                                        "encrypt"
                                    ).checked,

                                compactar:
                                    document.getElementById(
                                        "compress"
                                    ).checked,

                                quantidade:
                                    Number(
                                        document.getElementById(
                                            "retention"
                                        ).value
                                    ),

                                forcarManutencao:
                                    document.getElementById(
                                        "forceMaintenance"
                                    ).checked

                            })

                    }
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.sucesso
            ) {

                throw new Error(
                    data.mensagem ||
                    "Não foi possível iniciar o backup."
                );

            }


            addLog(
                `Processo iniciado. ID: ${data.jobId}`
            );


            acompanharBackup(
                data.jobId
            );


        } catch (error) {

            console.error(
                error
            );


            setProcessStatus(
                "error",
                "Falha"
            );


            addLog(
                `Erro ao iniciar backup: ${error.message}`
            );


            showMessage(
                error.message,
                "error"
            );

        }

    }
);

async function acompanharBackup(
    jobId
) {

    let ultimoLog =
        0;


    const intervalo =
        setInterval(
            async () => {

                try {

                    const response =
                        await fetch(
                            `${API_URL}/api/backup/${jobId}`
                        );


                    if (!response.ok) {

                        throw new Error(
                            "Não foi possível consultar o processo."
                        );

                    }


                    const data =
                        await response.json();


                    const job =
                        data.job;


                    // =========================================
                    // PROGRESSO
                    // =========================================

                    setProgress(
                        job.progresso,
                        job.mensagem
                    );


                    // =========================================
                    // STATUS
                    // =========================================

                    if (
                        job.status === "EXECUTANDO"
                    ) {

                        setProcessStatus(
                            "running",
                            "Executando"
                        );

                    }


                    // =========================================
                    // LOGS
                    // =========================================

                    if (
                        Array.isArray(
                            job.logs
                        )
                    ) {

                        while (
                            ultimoLog <
                            job.logs.length
                        ) {

                            const log =
                                job.logs[
                                    ultimoLog
                                ];


                            addLog(
                                log.mensagem,
                                log.horario
                            );


                            ultimoLog++;

                        }

                    }


                    // =========================================
                    // ETAPAS
                    // =========================================

                    atualizarEtapas(
                        job
                    );


                    // =========================================
                    // CONCLUÍDO
                    // =========================================

                    if (
                        job.status ===
                        "CONCLUIDO"
                    ) {

                        clearInterval(
                            intervalo
                        );


                        setProgress(
                            100,
                            job.mensagem
                        );


                        setProcessStatus(
                            "success",
                            "Concluído"
                        );


                        showMessage(
                            "Backup concluído com sucesso.",
                            "success"
                        );


                        return;

                    }


                    // =========================================
                    // FALHA
                    // =========================================

                    if (
                        job.status ===
                        "FALHA"
                    ) {

                        clearInterval(
                            intervalo
                        );


                        setProcessStatus(
                            "error",
                            "Falha"
                        );


                        addLog(
                            `Erro: ${job.erro}`
                        );


                        showMessage(
                            job.erro ||
                            "O backup falhou.",
                            "error"
                        );

                    }


                } catch (error) {

                    console.error(
                        "Erro ao acompanhar backup:",
                        error
                    );


                    clearInterval(
                        intervalo
                    );


                    setProcessStatus(
                        "error",
                        "Erro de comunicação"
                    );


                    addLog(
                        `Erro de comunicação com o servidor: ${error.message}`
                    );

                }

            },

            500
        );

}

function atualizarEtapas(
    job
) {

    const etapa =
        job.etapa;


    const etapas = {

        VALIDACAO:
            "connection",

        MANUTENCAO:
            "maintenance",

        BACKUP:
            "backup",

        CRIPTOGRAFIA:
            "security",

        COMPACTACAO:
            "security",

        COPIA_PRINCIPAL:
            "copy",

        COPIA_SECUNDARIA:
            "copy",

        RETENCAO:
            "retention",

        FINALIZADO:
            "retention"

    };


    const etapaAtual =
        etapas[etapa];


    const ordem = [

        "connection",

        "maintenance",

        "backup",

        "security",

        "copy",

        "retention"

    ];


    const indiceAtual =
        ordem.indexOf(
            etapaAtual
        );


    document
        .querySelectorAll(
            ".process-step"
        )
        .forEach(
            (element) => {

                const nome =
                    element.dataset.step;


                const indice =
                    ordem.indexOf(
                        nome
                    );


                const status =
                    element.querySelector(
                        ".step-status"
                    );


                element.classList.remove(
                    "running",
                    "completed",
                    "failed"
                );


                if (
                    job.status ===
                    "FALHA" &&
                    nome === etapaAtual
                ) {

                    element.classList.add(
                        "failed"
                    );


                    if (status) {

                        status.textContent =
                            "Falha";

                    }


                    return;

                }


                if (
                    indice <
                    indiceAtual
                ) {

                    element.classList.add(
                        "completed"
                    );


                    if (status) {

                        status.textContent =
                            "Concluído";

                    }

                } else if (
                    indice ===
                    indiceAtual &&
                    job.status !==
                    "CONCLUIDO"
                ) {

                    element.classList.add(
                        "running"
                    );


                    if (status) {

                        status.textContent =
                            "Em andamento...";

                    }

                } else if (
                    job.status ===
                    "CONCLUIDO"
                ) {

                    element.classList.add(
                        "completed"
                    );


                    if (status) {

                        status.textContent =
                            "Concluído";

                    }

                }

            }
        );

}

// =========================================================
// MONITORAMENTO DO JOB
// =========================================================

function iniciarMonitoramento(
    jobId
) {

    polling = true;

    lastJobMessage = null;

    lastJobStage = null;


    consultarStatusJob(
        jobId
    );

}


// =========================================================
// CONSULTAR STATUS
// =========================================================

async function consultarStatusJob(
    jobId
) {

    if (!polling) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/api/backup/status/${jobId}`
            );


        if (!response.ok) {

            throw new Error(
                "Não foi possível consultar o status do backup."
            );

        }


        const resultado =
            await response.json();


        if (!resultado.sucesso) {

            throw new Error(
                resultado.mensagem ||
                "Erro ao consultar o processo."
            );

        }


        const job =
            resultado.job;


        atualizarProcessoComJob(
            job
        );


        /*
         * Verifica se terminou.
         */

        if (
            job.status === "CONCLUIDO" ||
            job.status === "FALHA"
        ) {

            finalizarMonitoramento(
                job
            );

            return;

        }


        /*
         * Continua consultando.
         */

        setTimeout(
            () => {

                consultarStatusJob(
                    jobId
                );

            },
            500
        );


    } catch (error) {

        console.error(error);


        polling = false;


        setProcessStatus(
            "error",
            "Erro de comunicação"
        );


        addLog(
            `Erro ao consultar servidor: ${error.message}`
        );


        showMessage(
            "Ocorreu um erro ao acompanhar o processo de backup.",
            "error"
        );


        startBackupButton.disabled =
            false;

    }

}


// =========================================================
// ATUALIZAR PROCESSO
// =========================================================

function atualizarProcessoComJob(
    job
) {

    /*
     * Barra de progresso
     */

    setProgress(
        job.progresso || 0,
        job.mensagem ||
        "Processando..."
    );


    /*
     * Status geral
     */

    if (job.status === "EXECUTANDO") {

        setProcessStatus(
            "running",
            "Executando"
        );

    }


    if (job.status === "INICIANDO") {

        setProcessStatus(
            "running",
            "Iniciando"
        );

    }


    /*
     * Atualiza etapas visuais.
     */

    atualizarEtapas(
        job
    );


    /*
     * Adiciona mensagem nova ao log.
     */

    if (
        job.mensagem &&
        job.mensagem !== lastJobMessage
    ) {

        addLog(
            job.mensagem
        );

        lastJobMessage =
            job.mensagem;

    }


    /*
     * Adiciona mudança de etapa
     * ao log.
     */

    if (
        job.etapa &&
        job.etapa !== lastJobStage
    ) {

        const texto =
            obterTextoEtapa(
                job.etapa
            );


        if (texto) {

            addLog(
                `[${job.etapa}] ${texto}`
            );

        }


        lastJobStage =
            job.etapa;

    }

}


// =========================================================
// ETAPAS VISUAIS
// =========================================================

function atualizarEtapas(
    job
) {

    const progresso =
        Number(
            job.progresso || 0
        );


    /*
     * 1 - CONEXÃO / VALIDAÇÃO
     */

    if (progresso >= 10) {

        concluirEtapa(
            "connection"
        );

    }


    /*
     * 2 - MANUTENÇÃO
     */

    if (progresso >= 20) {

        concluirEtapa(
            "maintenance"
        );

    }


    /*
     * 3 - BACKUP
     */

    if (progresso >= 40) {

        concluirEtapa(
            "backup"
        );

    }


    /*
     * 4 - SEGURANÇA
     *
     * A etapa termina quando o backend
     * passa para retenção.
     */

    if (progresso >= 80) {

        concluirEtapa(
            "security"
        );

    }


    /*
     * 5 - CÓPIA
     */

    if (progresso >= 90) {

        concluirEtapa(
            "copy"
        );

    }


    /*
     * 6 - RETENÇÃO
     */

    if (progresso >= 80) {

        concluirEtapa(
            "retention"
        );

    }


    /*
     * Marca a etapa atual como
     * "Em andamento".
     */

    const etapaAtual =
        mapearEtapaVisual(
            job.etapa
        );


    if (
        etapaAtual &&
        job.status !== "CONCLUIDO" &&
        job.status !== "FALHA"
    ) {

        const elemento =
            document.querySelector(
                `[data-step="${etapaAtual}"]`
            );


        if (elemento) {

            elemento.classList.remove(
                "completed",
                "failed"
            );

            elemento.classList.add(
                "running"
            );


            const status =
                elemento.querySelector(
                    ".step-status"
                );


            if (status) {

                status.textContent =
                    "Em andamento...";

            }

        }

    }


    /*
     * Se finalizou com sucesso,
     * tudo fica concluído.
     */

    if (
        job.status === "CONCLUIDO"
    ) {

        document
            .querySelectorAll(".process-step")
            .forEach(
                (elemento) => {

                    elemento.classList.remove(
                        "running",
                        "failed"
                    );

                    elemento.classList.add(
                        "completed"
                    );


                    const status =
                        elemento.querySelector(
                            ".step-status"
                        );


                    if (status) {

                        status.textContent =
                            "Concluído";

                    }

                }
            );

    }


    /*
     * Se falhou, marca a etapa atual.
     */

    if (
        job.status === "FALHA"
    ) {

        if (etapaAtual) {

            marcarEtapaFalha(
                etapaAtual
            );

        }

    }

}


// =========================================================
// MAPEAR ETAPA DO BACKEND
// =========================================================

function mapearEtapaVisual(
    etapa
) {

    const mapa = {

        INICIANDO:
            "connection",

        VALIDACAO:
            "connection",

        MANUTENCAO:
            "maintenance",

        BACKUP:
            "backup",

        CRIPTOGRAFIA:
            "security",

        COMPACTACAO:
            "security",

        RETENCAO:
            "retention",

        COPIA_SECUNDARIA:
            "copy",

        FINALIZADO:
            "retention",

        ERRO:
            null

    };


    return mapa[etapa] || null;

}


// =========================================================
// TEXTO DAS ETAPAS
// =========================================================

function obterTextoEtapa(
    etapa
) {

    const textos = {

        INICIANDO:
            "Preparando processo...",

        VALIDACAO:
            "Validando configurações...",

        MANUTENCAO:
            "Verificando necessidade de manutenção...",

        BACKUP:
            "Gerando backup do banco de dados...",

        CRIPTOGRAFIA:
            "Criptografando o backup...",

        COMPACTACAO:
            "Compactando o backup...",

        RETENCAO:
            "Aplicando política de retenção...",

        COPIA_SECUNDARIA:
            "Copiando backup para o destino secundário...",

        FINALIZADO:
            "Backup finalizado.",

        ERRO:
            "Processo encerrado com erro."

    };


    return textos[etapa] || null;

}


// =========================================================
// CONCLUIR ETAPA
// =========================================================

function concluirEtapa(
    nome
) {

    const elemento =
        document.querySelector(
            `[data-step="${nome}"]`
        );


    if (!elemento) {
        return;
    }


    /*
     * Não sobrescreve uma etapa
     * que está executando atualmente.
     */

    if (
        elemento.classList.contains(
            "running"
        )
    ) {

        return;

    }


    elemento.classList.remove(
        "failed",
        "running"
    );


    elemento.classList.add(
        "completed"
    );


    const status =
        elemento.querySelector(
            ".step-status"
        );


    if (status) {

        status.textContent =
            "Concluído";

    }

}


// =========================================================
// ETAPA COM ERRO
// =========================================================

function marcarEtapaFalha(
    nome
) {

    const elemento =
        document.querySelector(
            `[data-step="${nome}"]`
        );


    if (!elemento) {
        return;
    }


    elemento.classList.remove(
        "running",
        "completed"
    );


    elemento.classList.add(
        "failed"
    );


    const status =
        elemento.querySelector(
            ".step-status"
        );


    if (status) {

        status.textContent =
            "Falhou";

    }

}


// =========================================================
// FINALIZAR MONITORAMENTO
// =========================================================

function finalizarMonitoramento(
    job
) {

    polling = false;


    if (
        job.status === "CONCLUIDO"
    ) {

        setProgress(
            100,
            "Processo concluído"
        );


        setProcessStatus(
            "success",
            "Concluído"
        );


        addLog(
            "Backup concluído com sucesso."
        );


        showMessage(
            "Processo concluído com sucesso.",
            "success"
        );


        document
            .querySelectorAll(".process-step")
            .forEach(
                (elemento) => {

                    elemento.classList.remove(
                        "running",
                        "failed"
                    );

                    elemento.classList.add(
                        "completed"
                    );


                    const status =
                        elemento.querySelector(
                            ".step-status"
                        );


                    if (status) {

                        status.textContent =
                            "Concluído";

                    }

                }
            );

    }


    if (
        job.status === "FALHA"
    ) {

        setProcessStatus(
            "error",
            "Falhou"
        );


        setProgress(
            job.progresso || 0,
            "Processo encerrado com erro"
        );


        addLog(
            `Backup falhou: ${job.erro || job.mensagem || "Erro desconhecido."}`
        );


        showMessage(
            job.erro ||
            "O processo de backup falhou.",
            "error"
        );

    }


    startBackupButton.disabled =
        false;

}


// =========================================================
// RESETAR PROCESSO
// =========================================================

function resetProcess() {

    setProgress(
        0,
        "Preparando execução"
    );


    document
        .querySelectorAll(
            ".process-step"
        )
        .forEach(
            (step) => {

                step.classList.remove(
                    "running",
                    "completed",
                    "failed"
                );


                const status =
                    step.querySelector(
                        ".step-status"
                    );


                if (status) {

                    status.textContent =
                        "Aguardando";

                }

            }
        );


    liveLog.innerHTML = "";

}

// =========================================================
// PROGRESSO
// =========================================================

function setProgress(
    percentage,
    text
) {

    const progressBar =
        document.getElementById(
            "progressBar"
        );

    const progressPercent =
        document.getElementById(
            "progressPercent"
        );

    const progressText =
        document.getElementById(
            "progressText"
        );


    const valor =
        Math.max(
            0,
            Math.min(
                100,
                Number(percentage) || 0
            )
        );


    progressBar.style.width =
        `${valor}%`;


    progressPercent.textContent =
        `${valor}%`;


    progressText.textContent =
        text;

}


// =========================================================
// STATUS DO PROCESSO
// =========================================================

function setProcessStatus(
    type,
    text
) {

    const badge =
        document.getElementById(
            "processStatusBadge"
        );


    badge.className =
        `badge ${type}`;


    badge.textContent =
        text;

}


// =========================================================
// LOG
// =========================================================

function addLog(
    text,
    timestamp = null
) {

    const now =
        timestamp
            ? new Date(timestamp)
            : new Date();


    const time =
        now.toLocaleTimeString(
            "pt-BR"
        );


    const line =
        document.createElement(
            "div"
        );


    line.className =
        "log-line";


    line.innerHTML = `
        <span class="log-time">
            ${time}
        </span>

        <span>
            ${escapeHtml(text)}
        </span>
    `;


    liveLog.appendChild(
        line
    );


    liveLog.scrollTop =
        liveLog.scrollHeight;

}


// =========================================================
// HISTÓRICO
// =========================================================

refreshHistoryButton.addEventListener(
    "click",
    () => {

        showMessage(
            "O histórico será carregado do backend na próxima etapa.",
            "warning"
        );

    }
);


// =========================================================
// MODAL DE LOG
// =========================================================

closeLogModal.addEventListener(
    "click",
    () => {

        closeModal(
            logModal
        );

    }
);


// =========================================================
// MODAL
// =========================================================

function openModal(
    modal
) {

    modal.classList.remove(
        "hidden"
    );

}


function closeModal(
    modal
) {

    modal.classList.add(
        "hidden"
    );

}


// =========================================================
// MENSAGENS
// =========================================================

function showMessage(
    text,
    type
) {

    message.textContent =
        text;

    message.className =
        `message ${type}`;

}


function clearMessage() {

    message.textContent =
        "";

    message.className =
        "message hidden";

}


// =========================================================
// NAVEGAR
// =========================================================

function navigateTo(
    section
) {

    const nav =
        document.querySelector(
            `[data-section="${section}"]`
        );


    if (nav) {

        nav.click();

    }

}


// =========================================================
// SEGURANÇA DO LOG
// =========================================================

function escapeHtml(
    value
) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        value;

    return div.innerHTML;

}