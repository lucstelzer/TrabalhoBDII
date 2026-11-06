require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { conn, sql } = require('./database.js');
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('./public'));
const PORT = process.env.PORT;

async function iniciarServidor(){
  try{
    const pool = await conn();
    await pool.request().query('exec teste');
    console.log('Conexão estabelecida');

    app.listen(PORT, () => {
      console.log(`Servidor rodando em: http://localhost:${PORT}`);
    });
  }catch(err){
    console.error('Falha ao inicializar o servidor:', err.message);
    process.exit(1);
  }
}

iniciarServidor();

app.get('/api/regioes', async (req, res) => {
  try {
    const pool = await conn();
    const resultado = await pool.request().query('exec regioes');
    res.json(resultado.recordset)
  }catch(err){
    console.error('A consulta no banco falhou', err.message)
    res.status(500).json({erro: err.message});
  }
});

app.get('/api/regioes/:nome', async (req, res) => {
  const {nome} = req.params;

  try{
    const pool = await conn();
    const resultado = await pool.request().query(`exec TotalVendidoRegiao @nome='${nome}'`)
    
    res.json(resultado.recordset);
  }catch(err){
    console.error('Erro na execução:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

app.get('/api/pedidos', async (req, res) => {
  try{
    const pool = await conn();
    const valida = await pool.request().query('exec verificarPedido');
    const resultado = await pool.request().query('exec cancelarPedido');
  }catch(err){
    console.error('Erro ao cancelar pedido:', err.message);

  }
});

