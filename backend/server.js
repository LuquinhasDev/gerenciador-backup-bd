const express = require("express");
const cors = require("cors");
const pool = require("./database");

const app = express();

app.use(cors());

app.use(express.json());

app.get("/api/veiculos", async (req, res) => {

    try {

        const resultado = await pool.query(`
            SELECT *
            FROM veiculos
        `);

        res.json(resultado.rows);

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            erro: "Erro ao consultar veículos"
        });

    }

});


const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});