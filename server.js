require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { conn, sql } = require('./database.js');
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('./public'));
const PORT = process.env.PORT;

async function iniciarServidor() {
  try {
    const pool = await conn();
    await pool.request().query('exec teste');
    console.log('Conexão estabelecida');

    app.listen(PORT, () => {
      console.log(`Servidor rodando em: http://localhost:${PORT}`);
    });
  } catch (err) {
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
  } catch (err) {
    console.error('A consulta no banco falhou', err.message)
    res.status(500).json({ erro: err.message });
  }
});

app.get('/api/regioes/:nome', async (req, res) => {
  const { nome } = req.params;

  try {
    const pool = await conn();
    const resultado = await pool.request()
      .input('nome', sql.VarChar(100), nome)
      .execute('TotalVendidoRegiao');

    res.json(resultado.recordset);
  } catch (err) {
    console.error('Erro na execução:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

app.get('/api/pedidos', async (req, res) => {
  try {
    const pool = await conn();
    const valida = await pool.request().query('exec verificarPedido');
    const resultado = await pool.request().query('exec cancelarPedido');
  } catch (err) {
    console.error('Erro ao cancelar pedido:', err.message);

  }
});

app.get('/api/clientes', async (req, res) => {
  try {
    const pool = await conn();
    const resultado = await pool.request().query('exec clientes');
    res.json(resultado.recordset)
  } catch (err) {
    console.error('A consulta no banco falhou', err.message)
    res.status(500).json({ erro: err.message });
  }
});

app.get('/api/clientes/:nome', async (req, res) => {
  const { nome } = req.params;
  try {
    const pool = await conn();
    const resultado = await pool.request()
      .input('nome', sql.VarChar(100), nome)
      .execute('TotalVendidoCliente');
    res.json(resultado.recordset);
  } catch (err) {
    console.error('Erro na execução:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

app.get('/api/comissoes/:vendedor', async (req, res) => {
  const { vendedor } = req.params;
  try {
    const pool = await conn();
    const resultado = await pool.request()
      .input('vendedor', sql.VarChar(100), vendedor)
      .execute('ComissaoVendedorProduto');

    res.json(resultado.recordset);
  } catch (err) {
    console.error('Erro na execução:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

app.get('/api/produtos', async (req, res) => {
  const busca = req.query.busca || '';

  try {
    const pool = await conn();
    const resultado = await pool.request()
      .input('produto', sql.VarChar(100), busca)
      .execute('TotalVendidoProduto');

    res.json(resultado.recordset);
  } catch (err) {
    console.error('Erro na execução:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

app.get('/api/vendedores/:nome', async (req, res) => {
  const { nome } = req.params;
  try {
    const pool = await conn();
    const resultado = await pool.request()
      .input('nome', sql.VarChar(100), nome)
      .execute('TotalPorVendedor');
    res.json(resultado.recordset);
  } catch (err) {
    console.error('Erro na execução:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

app.get('/api/clientesPorRegiao/:nome', async (req, res) => {
  const { nome } = req.params;
  try {
    const pool = await conn();
    const resultado = await pool.request()
      .input('nome', sql.VarChar(100), nome)
      .execute('ClientesPorRegiao');
    res.json(resultado.recordset);
  } catch (err) {
    console.error('Erro na execução:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

app.get('/api/cidades', async (req, res) => {
  try {
    const pool = await conn();
    const resultado = await pool.request().query('exec cidades');
    res.json(resultado.recordset);
  } catch (err) {
    console.error('A consulta de cidades no banco falhou:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

app.post('/api/clientes', async (req, res) => {
  const { nome_razao_social, cpf_cnpj, telefone, fk_regiao, fk_cidade } = req.body;
  try {
    const pool = await conn();
    await pool.request()
      .input('nome_razao_social', sql.VarChar(100), nome_razao_social)
      .input('cpf_cnpj', sql.VarChar(20), cpf_cnpj)
      .input('telefone', sql.VarChar(20), telefone)
      .input('fk_regiao', sql.Int, fk_regiao)
      .input('fk_cidade', sql.Int, fk_cidade)
      .execute('inserirCliente');

    res.status(201).json({ mensagem: 'Cliente cadastrado com sucesso!' });
  } catch (err) {
    console.error('Erro ao cadastrar cliente:', err.message);
    res.status(500).json({ erro: err.message });
  }
});