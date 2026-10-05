async function criarExecucao({
    id,
    bancoDados = null,
    dataInicio,
    operacao = "BACKUP",
    quantidadeRetencao = null,
    destinoPrincipal = null,
    destinoSecundario = null,
    criptografado = false,
    compactado = false
}, dbPool) {

    if (!dbPool) {
        throw new Error(
            "Pool do banco de dados não informado."
        );
    }

    await dbPool.query(`
        INSERT INTO historico_execucoes
        (
            id,
            data_inicio,
            banco_dados,
            operacao,
            status,
            destino_principal,
            destino_secundario,
            criptografado,
            compactado,
            quantidade_retencao
        )
        VALUES
        (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10
        )
    `, [
        id,
        dataInicio,
        bancoDados,
        operacao,
        "EXECUTANDO",
        destinoPrincipal,
        destinoSecundario,
        criptografado,
        compactado,
        quantidadeRetencao
    ]);
}

async function registrarLog({
    execucaoId,
    etapa,
    mensagem,
    nivel = "INFO",
    detalhes = null
}, dbPool) {
    if (!dbPool) throw new Error("Pool do banco de dados não informado.");

    let detalhesJSON = null;

    if (detalhes !== null && detalhes !== undefined) {
        detalhesJSON = typeof detalhes === "string"
            ? detalhes
            : JSON.stringify(detalhes);
    }

    await dbPool.query(`
        INSERT INTO logs_execucao
        (execucao_id, etapa, nivel, mensagem, detalhes)
        VALUES ($1,$2,$3,$4,$5::jsonb)
    `, [execucaoId, etapa, nivel, mensagem, detalhesJSON]);
}

async function finalizarExecucao({
    id,
    dataFim,
    status,
    mensagem,
    regraManutencao = null,
    manutencaoStatus = null,
    arquivoBackup = null,
    chaveAes = null,
    ivAes = null
}, dbPool) {
    if (!dbPool) throw new Error("Pool do banco de dados não informado.");

    await dbPool.query(`
        UPDATE historico_execucoes
        SET
            data_fim = $2,
            duracao = $2 - data_inicio,
            status = $3,
            mensagem = $4,
            regra_manutencao = $5,
            manutencao_status = $6,
            arquivo_backup = $7,
            chave_aes = COALESCE($8, chave_aes),
            iv_aes = COALESCE($9, iv_aes)
        WHERE id = $1
    `, [
        id, dataFim, status, mensagem,
        regraManutencao, manutencaoStatus,
        arquivoBackup, chaveAes, ivAes
    ]);
}

async function buscarHistorico(dbPool) {
    if (!dbPool) throw new Error("Pool do banco de dados não informado.");

    const resultado = await dbPool.query(`
        SELECT
            id, data_inicio, data_fim, duracao, banco_dados,
            regra_manutencao, manutencao_status, operacao, status,
            mensagem, arquivo_backup, destino_principal,
            destino_secundario, criptografado, compactado,
            quantidade_retencao
        FROM historico_execucoes
        ORDER BY data_inicio DESC
    `);

    return resultado.rows;
}

async function buscarLogs(execucaoId, dbPool) {
    if (!dbPool) throw new Error("Pool do banco de dados não informado.");

    const resultado = await dbPool.query(`
        SELECT
            id, data_hora, etapa, nivel, mensagem, detalhes
        FROM logs_execucao
        WHERE execucao_id = $1
        ORDER BY data_hora ASC, id ASC
    `, [execucaoId]);

    return resultado.rows;
}

async function buscarDadosRestauracao(execucaoId, dbPool) {
    if (!dbPool) throw new Error("Pool do banco de dados não informado.");

    const resultado = await dbPool.query(`
        SELECT
            id, banco_dados, arquivo_backup, destino_principal,
            destino_secundario, criptografado, compactado,
            chave_aes, iv_aes
        FROM historico_execucoes
        WHERE id = $1
        LIMIT 1
    `, [execucaoId]);

    return resultado.rows[0] || null;
}

module.exports = {
    criarExecucao,
    registrarLog,
    finalizarExecucao,
    buscarHistorico,
    buscarLogs,
    buscarDadosRestauracao
};
