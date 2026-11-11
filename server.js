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

function extrairErroProcedure(resultado) {
  const linha = resultado?.recordset?.[0];
  if (!linha) return null;
  if (linha.erro) return linha.erro;
  for (const valor of Object.values(linha)) {
    if (typeof valor === 'string' && /^erro/i.test(valor.trim())) {
      return valor;
    }
  }
  return null;
}

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

app.post('/api/regioes', async (req, res) => {
  const { nome_regiao, fk_vendedor } = req.body;
  try {
    const pool = await conn();
    const resultado = await pool.request()
      .input('nome_regiao', sql.VarChar(100), nome_regiao)
      .input('fk_vendedor', sql.Int, parseInt(fk_vendedor))
      .execute('InserirRegiao');

    const erroProc = extrairErroProcedure(resultado);
    if (erroProc) {
      return res.status(400).json({ erro: erroProc });
    }

    res.status(201).json({ mensagem: 'Região criada com sucesso!' });
  } catch (err) {
    console.error('Erro ao criar região:', err.message);
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

    const erroProc = extrairErroProcedure(resultado);
    if (erroProc) {
      return res.status(400).json({ erro: erroProc });
    }

    res.json(resultado.recordset);
  } catch (err) {
    console.error('Erro ao cancelar pedido:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

app.post('/api/pedidos', async (req, res) => {
  const { fk_cliente, fk_vendedor, fk_produto, quantidade, preco_praticado, percentual_comissao, itens } = req.body;
  const listaItens = Array.isArray(itens) && itens.length > 0
    ? itens
    : [{ fk_produto, quantidade, preco_praticado, percentual_comissao }];

  try {
    const pool = await conn();

    const resPedido = await pool.request()
      .input('fk_cliente', sql.Int, parseInt(fk_cliente))
      .input('fk_vendedor', sql.Int, parseInt(fk_vendedor))
      .execute('CriarPedido');

    const erroPedido = extrairErroProcedure(resPedido);
    if (erroPedido) {
      return res.status(400).json({ erro: erroPedido });
    }

    const dadosPedido = resPedido.recordset?.[0];
    const idPedidoGerado = dadosPedido?.id_pedido_gerado;
    if (!idPedidoGerado) {
      return res.status(400).json({ erro: 'Não foi possível gerar o número do pedido.' });
    }

    for (const item of listaItens) {
      const resItem = await pool.request()
        .input('fk_pedido', sql.Int, idPedidoGerado)
        .input('fk_produto', sql.Int, parseInt(item.fk_produto))
        .input('quantidade', sql.Int, parseInt(item.quantidade))
        .input('preco_praticado', sql.Decimal(10, 2), parseFloat(item.preco_praticado))
        .input('percentual_comissao', sql.Decimal(5, 2), parseFloat(item.percentual_comissao))
        .execute('AdicionarItemPedido');

      const erroItem = extrairErroProcedure(resItem);
      if (erroItem) {
        return res.status(400).json({ erro: erroItem });
      }
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

    const erroProc = extrairErroProcedure(resultado);
    if (erroProc) {
      return res.status(400).json({ erro: erroProc });
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

    const erroProc = extrairErroProcedure(resultado);
    if (erroProc) {
      return res.status(400).json({ erro: erroProc });
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
      .execute('ListarVendedores');
    res.json(resultado.recordset);
  } catch (err) {
    console.error('Erro ao listar representantes:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// 2. Cadastrar novo representante
app.post('/api/vendedores', async (req, res) => {
  const { nome, telefone, email, fk_cidade } = req.body;
  try {
    const pool = await conn();
    const resultado = await pool.request()
      .input('nome', sql.VarChar(150), nome)
      .input('email', sql.VarChar(100), email)
      .input('telefone', sql.VarChar(20), telefone || null)
      .input('fk_cidade', sql.Int, parseInt(fk_cidade))
      .execute('InserirVendedor');

    const erroProc = extrairErroProcedure(resultado);
    if (erroProc) {
      return res.status(400).json({ erro: erroProc });
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

    const erroProc = extrairErroProcedure(resultado);
    if (erroProc) {
      return res.status(400).json({ erro: erroProc });
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
      .input('motivo', sql.VarChar(255), motivo || null)
      .execute('RetirarVendedor');

    const erroProc = extrairErroProcedure(resultado);
    if (erroProc) {
      return res.status(400).json({ erro: erroProc });
    }

    res.json({ mensagem: 'Representante retirado com sucesso!' });
  } catch (err) {
    console.error('Erro ao retirar representante:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ==========================================
// ROTAS DA ABA DE PRODUTOS
// ==========================================

// 1. Cadastrar novo produto
app.post('/api/produtos', async (req, res) => {
  const { descricao, preco_tabela } = req.body;
  try {
    const pool = await conn();
    const resultado = await pool.request()
      .input('descricao', sql.VarChar(150), descricao)
      .input('preco_tabela', sql.Decimal(10, 2), parseFloat(preco_tabela))
      .execute('sp_InserirProduto');

    const erroProc = extrairErroProcedure(resultado);
    if (erroProc) {
      return res.status(400).json({ erro: erroProc });
    }

    res.status(201).json({ mensagem: 'Produto cadastrado com sucesso!' });
  } catch (err) {
    console.error('Erro ao cadastrar produto:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// 2. Excluir produto
app.delete('/api/produtos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await conn();
    const resultado = await pool.request()
      .input('id_produto', sql.Int, parseInt(id))
      .execute('ExcluirProduto');

    const erroProc = extrairErroProcedure(resultado);
    if (erroProc) {
      return res.status(400).json({ erro: erroProc });
    }

    res.json({ mensagem: 'Produto excluído com sucesso!' });
  } catch (err) {
    console.error('Erro ao excluir produto:', err.message);
    res.status(500).json({ erro: err.message });
  }
});