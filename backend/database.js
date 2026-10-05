const { Pool } = require("pg");

function validarConfig(config = {}) {
    const host = String(config.host || "").trim();
    const port = Number(config.port);
    const database = String(config.database || "").trim();
    const user = String(config.user || "").trim();
    const password = String(config.password ?? "");

    if (!host) throw new Error("Informe o host do banco de dados.");
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Informe uma porta válida.");
    if (!database) throw new Error("Informe o nome do banco de dados.");
    if (!user) throw new Error("Informe o usuário do banco de dados.");
    if (!password) throw new Error("Informe a senha do banco de dados.");

    return { host, port, database, user, password };
}

function criarPool(config) {
    const conexao = validarConfig(config);

    return new Pool({
        host: conexao.host,
        port: conexao.port,
        database: conexao.database,
        user: conexao.user,
        password: conexao.password,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
    });
}

async function testarConexao(config) {
    const conexao = validarConfig(config);
    const bancoPool = criarPool(conexao);

    try {
        const resultado = await bancoPool.query(
            "SELECT COUNT(*)::int AS total FROM veiculos"
        );

        return {
            sucesso: true,
            total: resultado.rows[0].total
        };
    } finally {
        await bancoPool.end();
    }
}

async function fecharPool(pool) {
    if (pool) {
        await pool.end();
    }
}

module.exports = {
    criarPool,
    validarConfig,
    testarConexao,
    fecharPool
};
