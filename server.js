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
    res.json(resultado.recordset);
  } catch (err) {
    console.error('A consulta no banco falhou', err.message);
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
  const id = parseInt(req.query.id);
  try {
    const pool = await conn();
    const resultado = await pool.request()
      .input('id_pedido', sql.Int, id)
      .execute('CancelarPedido');
    res.json(resultado.recordset);
  } catch (err) {
    console.error('Erro ao cancelar pedido:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

app.post('/api/pedidos', async (req, res) => {
  const { fk_cliente, fk_vendedor, fk_produto, quantidade, preco_praticado, percentual_comissao } = req.body;
  try {
    const pool = await conn();

    const resPedido = await pool.request()
      .input('fk_cliente', sql.Int, fk_cliente)
      .input('fk_vendedor', sql.Int, fk_vendedor)
      .execute('CriarPedido');

    const dadosPedido = resPedido.recordset[0];
    if (dadosPedido && dadosPedido.erro) {
      return res.status(400).json({ erro: dadosPedido.erro });
    }

    const idPedidoGerado = dadosPedido.id_pedido_gerado;

    const resItem = await pool.request()
      .input('fk_pedido', sql.Int, idPedidoGerado)
      .input('fk_produto', sql.Int, fk_produto)
      .input('quantidade', sql.Int, quantidade)
      .input('preco_praticado', sql.Decimal(10, 2), preco_praticado)
      .input('percentual_comissao', sql.Decimal(5, 2), percentual_comissao)
      .execute('AdicionarItemPedido');

    const dadosItem = resItem.recordset[0];
    if (dadosItem && dadosItem.erro) {
      return res.status(400).json({ erro: dadosItem.erro });
    }

    res.status(201).json({
      mensagem: 'Pedido emitido com sucesso!',
      id_pedido: idPedidoGerado
    });
  } catch (err) {
    console.error('Erro ao criar pedido:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

app.get('/api/clientes', async (req, res) => {
  try {
    const pool = await conn();
    const resultado = await pool.request().query('exec clientes');
    res.json(resultado.recordset);
  } catch (err) {
    console.error('A consulta no banco falhou', err.message);
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
    const resultado = await pool.request()
      .input('nome_razao_social', sql.VarChar(150), nome_razao_social)
      .input('cpf_cnpj', sql.VarChar(20), cpf_cnpj)
      .input('telefone', sql.VarChar(20), telefone)
      .input('fk_regiao', sql.Int, parseInt(fk_regiao))
      .input('fk_cidade', sql.Int, parseInt(fk_cidade))
      .execute('inserirCliente');

    const dados = resultado.recordset?.[0];
    if (dados && dados.erro) {
      return res.status(400).json({ erro: dados.erro });
    }

    res.status(201).json({ mensagem: 'Cliente cadastrado com sucesso!' });
  } catch (err) {
    console.error('Erro ao cadastrar cliente:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

app.put('/api/clientes/regiao', async (req, res) => {
  const { id_cliente, id_nova_regiao } = req.body;
  try {
    const pool = await conn();
    const resultado = await pool.request()
      .input('id_cliente', sql.Int, parseInt(id_cliente))
      .input('id_nova_regiao', sql.Int, parseInt(id_nova_regiao))
      .execute('ReatribuirClienteRegiao');

    const dados = resultado.recordset?.[0];
    if (dados && dados.erro) {
      return res.status(400).json({ erro: dados.erro });
    }

    res.json({ mensagem: 'Região do cliente atualizada com sucesso!' });
  } catch (err) {
    console.error('Erro ao transferir região do cliente:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

app.get('/api/clientes-vendedores', async (req, res) => {
  const nome = req.query.nome || '';
  try {
    const pool = await conn();
    const resultado = await pool.request()
      .input('nome', sql.VarChar(150), nome)
      .execute('BuscarClienteVendedor');
    res.json(resultado.recordset);
  } catch (err) {
    console.error('Erro ao buscar cliente/vendedor:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

app.get('/api/produtos-catalogo', async (req, res) => {
  try {
    const pool = await conn();
    const resultado = await pool.request().execute('ProdutosPedido');
    res.json(resultado.recordset);
  } catch (err) {
    console.error('Erro ao buscar catálogo de produtos:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ==========================================
// ROTAS DA ABA DE REPRESENTANTES (VENDEDORES)
// ==========================================

// 1. Listar todos os representantes
app.get('/api/vendedores', async (req, res) => {
  try {
    const pool = await conn();
    const resultado = await pool.request()
      .execute('exec ListarVendedores'); // <-- Insira o nome da procedure aqui
    res.json(resultado.recordset);
  } catch (err) {
    console.error('Erro ao listar representantes:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// 2. Cadastrar novo representante
app.post('/api/vendedores', async (req, res) => {
  const { nome, cpf_cnpj, telefone, email, fk_regiao } = req.body;
  try {
    const pool = await conn();
    const resultado = await pool.request()
      .input('nome', sql.VarChar(150), nome)
      .input('cpf_cnpj', sql.VarChar(20), cpf_cnpj)
      .input('telefone', sql.VarChar(20), telefone)
      .input('email', sql.VarChar(150), email)
      .input('fk_regiao', sql.Int, parseInt(fk_regiao))
      .execute('InserirVendedor');

    const dados = resultado.recordset?.[0];
    if (dados && dados.erro) {
      return res.status(400).json({ erro: dados.erro });
    }

    res.status(201).json({ mensagem: 'Representante cadastrado com sucesso!' });
  } catch (err) {
    console.error('Erro ao cadastrar representante:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// 3. Mover região de um representante
app.put('/api/vendedores/regiao', async (req, res) => {
  const { idVendedor, idNovaRegiao } = req.body;
  try {
    const pool = await conn();
    const resultado = await pool.request()
      .input('idVendedor', sql.Int, parseInt(idVendedor))
      .input('idNovaRegiao', sql.Int, parseInt(idNovaRegiao))
      .execute('TransferirRegiaoVendedor');

    const dados = resultado.recordset?.[0];
    if (dados && dados.erro) {
      return res.status(400).json({ erro: dados.erro });
    }

    res.json({ mensagem: 'Região do representante atualizada com sucesso!' });
  } catch (err) {
    console.error('Erro ao mover região do representante:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// 4. Retirar (desligar/excluir) representante
app.delete('/api/vendedores', async (req, res) => {
  const { idVendedor, motivo } = req.body;
  try {
    const pool = await conn();
    const resultado = await pool.request()
      .input('idVendedor', sql.Int, parseInt(idVendedor))
      .input('motivo', sql.VarChar(255), motivo)
      .execute('NOME_PROC_RETIRAR_VENDEDOR'); // <-- Insira o nome da procedure aqui

    const dados = resultado.recordset?.[0];
    if (dados && dados.erro) {
      return res.status(400).json({ erro: dados.erro });
    }

    res.json({ mensagem: 'Representante retirado com sucesso!' });
  } catch (err) {
    console.error('Erro ao retirar representante:', err.message);
    res.status(500).json({ erro: err.message });
  }
});