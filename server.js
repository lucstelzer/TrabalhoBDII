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
  app.listen(PORT, () => {
    console.log(`Servidor rodando em: http://localhost:${PORT}`);
  });

  try {
    const pool = await conn();
    await pool.request().query('exec teste');
    console.log('Conexão estabelecida');
  } catch (err) {
    console.error('Aviso ao inicializar conexão com o banco:', err.message);
  }
}

iniciarServidor();

function extrairErroProcedure(resultado) {
  const linha = resultado?.recordset?.[0];
  if (!linha) return null;
  if (linha.erro) return linha.erro;
  if (linha.aviso) return linha.aviso;
  for (const valor of Object.values(linha)) {
    if (typeof valor === 'string') {
      const texto = valor.trim();
      if (
        !/sucesso/i.test(texto) &&
        (/^erro/i.test(texto) ||
          /(\berro\b|n[aã]o\s+(foi|pode|é\s+poss[ií]vel)|imposs[ií]vel|j[aá]\s+foi\s+comprado|j[aá]\s+possui|vinculad[oa]|conflito|inv[aá]lid[oa])/i.test(texto))
      ) {
        return texto;
      }
    }
  }
  return null;
}

function converterDataSQL(dataStr) {
  if (!dataStr || typeof dataStr !== 'string') return null;
  const limpo = dataStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(limpo)) return null;
  return new Date(`${limpo}T00:00:00.000Z`);
}

function filtrarListaPorDataJS(lista, dataInicioStr, dataFimStr) {
  if (!Array.isArray(lista) || (!dataInicioStr && !dataFimStr)) return lista || [];
  const dtIni = dataInicioStr ? new Date(`${dataInicioStr}T00:00:00`) : null;
  const dtFim = dataFimStr ? new Date(`${dataFimStr}T23:59:59.999`) : null;

  return lista.filter(item => {
    if (!item || typeof item !== 'object') return true;
    const chaveData = Object.keys(item).find(k => /data|date|emissao|criacao/i.test(k));
    if (!chaveData || !item[chaveData]) return true;
    const valorData = new Date(item[chaveData]);
    if (isNaN(valorData.getTime())) return true;
    if (dtIni && valorData < dtIni) return false;
    if (dtFim && valorData > dtFim) return false;
    return true;
  });
}

async function executarRelatorioComDatas(pool, nomeProc, inputsBase, dataInicioStr, dataFimStr) {
  const temFiltroData = Boolean(dataInicioStr || dataFimStr);
  const dtInicio = converterDataSQL(dataInicioStr || (temFiltroData ? '1900-01-01' : null));
  const dtFim = converterDataSQL(dataFimStr || (temFiltroData ? '2099-12-31' : null));

  const criarRequisicaoBase = () => {
    const req = pool.request();
    for (const inp of inputsBase) {
      req.input(inp.nome, inp.tipo, inp.valor);
    }
    return req;
  };

  if (temFiltroData) {
    // 1. Tenta passar @data_inicio e @data_fim
    try {
      const resultado = await criarRequisicaoBase()
        .input('data_inicio', sql.Date, dtInicio)
        .input('data_fim', sql.Date, dtFim)
        .execute(nomeProc);
      return resultado.recordset || [];
    } catch (err1) {
      // 2. Tenta passar @dataInicio e @dataFim
      try {
        const resultado = await criarRequisicaoBase()
          .input('dataInicio', sql.Date, dtInicio)
          .input('dataFim', sql.Date, dtFim)
          .execute(nomeProc);
        return resultado.recordset || [];
      } catch {
        // 3. Fallback caso a procedure no banco ainda não receba parâmetros de data
        const resultadoSemData = await criarRequisicaoBase().execute(nomeProc);
        return filtrarListaPorDataJS(resultadoSemData.recordset || [], dataInicioStr, dataFimStr);
      }
    }
  } else {
    // Sem filtro de data preenchido: tenta primeiro sem parâmetros de data (ou com defaults NULL da proc)
    try {
      const resultado = await criarRequisicaoBase().execute(nomeProc);
      return resultado.recordset || [];
    } catch {
      // Caso a procedure exija @data_inicio e @data_fim obrigatoriamente
      try {
        const resultado = await criarRequisicaoBase()
          .input('data_inicio', sql.Date, null)
          .input('data_fim', sql.Date, null)
          .execute(nomeProc);
        return resultado.recordset || [];
      } catch {
        const resultado = await criarRequisicaoBase()
          .input('data_inicio', sql.Date, converterDataSQL('1900-01-01'))
          .input('data_fim', sql.Date, converterDataSQL('2099-12-31'))
          .execute(nomeProc);
        return resultado.recordset || [];
      }
    }
  }
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
  const { dataInicio, dataFim } = req.query;

  try {
    const pool = await conn();
    const recordset = await executarRelatorioComDatas(
      pool,
      'TotalVendidoRegiao',
      [{ nome: 'nome', tipo: sql.VarChar(100), valor: nome }],
      dataInicio,
      dataFim
    );

    res.json(recordset);
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
  const { dataInicio, dataFim } = req.query;
  try {
    const pool = await conn();
    const recordset = await executarRelatorioComDatas(
      pool,
      'TotalVendidoCliente',
      [{ nome: 'nome', tipo: sql.VarChar(100), valor: nome }],
      dataInicio,
      dataFim
    );
    res.json(recordset);
  } catch (err) {
    console.error('Erro na execução:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

app.get('/api/comissoes/:vendedor', async (req, res) => {
  const { vendedor } = req.params;
  const { dataInicio, dataFim } = req.query;
  try {
    const pool = await conn();
    const recordset = await executarRelatorioComDatas(
      pool,
      'ComissaoVendedorProduto',
      [{ nome: 'vendedor', tipo: sql.VarChar(100), valor: vendedor }],
      dataInicio,
      dataFim
    );

    res.json(recordset);
  } catch (err) {
    console.error('Erro na execução:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

app.get('/api/produtos', async (req, res) => {
  const busca = (req.query.busca || '').trim();
  const { dataInicio, dataFim } = req.query;

  try {
    const pool = await conn();
    let lista = [];

    try {
      lista = await executarRelatorioComDatas(
        pool,
        'TotalVendidoProduto',
        [{ nome: 'produto', tipo: sql.VarChar(100), valor: busca }],
        dataInicio,
        dataFim
      );
    } catch {
      lista = await executarRelatorioComDatas(
        pool,
        'TotalVendidoProduto',
        [],
        dataInicio,
        dataFim
      );
    }

    if (busca && lista.length === 0) {
      try {
        lista = await executarRelatorioComDatas(
          pool,
          'TotalVendidoProduto',
          [{ nome: 'produto', tipo: sql.VarChar(100), valor: '' }],
          dataInicio,
          dataFim
        );
      } catch {
        // Mantém lista vazia se a chamada padrão também falhar
      }
    }

    if (busca) {
      const termo = busca
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

      lista = lista.filter(item => {
        const nomeProd = String(item.produto ?? item.Produto ?? item.descricao ?? item.Descricao ?? Object.values(item)[0] ?? '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
        return nomeProd.includes(termo);
      });
    }

    res.json(lista);
  } catch (err) {
    console.error('Erro na execução:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

app.get('/api/vendedores/:nome', async (req, res) => {
  const { nome } = req.params;
  const { dataInicio, dataFim } = req.query;
  try {
    const pool = await conn();
    const recordset = await executarRelatorioComDatas(
      pool,
      'TotalPorVendedor',
      [{ nome: 'nome', tipo: sql.VarChar(100), valor: nome }],
      dataInicio,
      dataFim
    );
    res.json(recordset);
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
  const idProduto = parseInt(req.params.id);
  const msgJaComprado = 'Aviso: Este produto não foi excluído pois já foi comprado anteriormente em um pedido.';

  try {
    const pool = await conn();
    const resultado = await pool.request()
      .input('id_produto', sql.Int, idProduto)
      .execute('ExcluirProduto');

    const erroProc = extrairErroProcedure(resultado);
    if (erroProc) {
      return res.status(400).json({ erro: erroProc, naoExcluido: true });
    }

    // Verifica se o produto continua cadastrado no catálogo após a procedure
    // (caso a procedure bloqueie silenciosamente a exclusão por já possuir compras vinculadas)
    try {
      const catalogoPosExclusao = await pool.request().execute('ProdutosPedido');
      const listaCatalogo = catalogoPosExclusao.recordset || [];
      const aindaExiste = listaCatalogo.some(p => Number(p.id_produto) === idProduto);
      if (aindaExiste) {
        return res.status(400).json({ erro: msgJaComprado, naoExcluido: true });
      }
    } catch {
      const linhasAfetadas = Array.isArray(resultado.rowsAffected)
        ? resultado.rowsAffected.reduce((acc, n) => acc + n, 0)
        : 1;
      if (linhasAfetadas === 0) {
        return res.status(400).json({ erro: msgJaComprado, naoExcluido: true });
      }
    }

    res.json({ mensagem: 'Produto excluído com sucesso!' });
  } catch (err) {
    console.error('Erro ao excluir produto:', err.message);
    if (/reference|fk_|foreign key|pedido|item_pedido|conflit|547/i.test(err.message) || err.number === 547) {
      return res.status(400).json({ erro: msgJaComprado, naoExcluido: true });
    }
    res.status(500).json({ erro: err.message });
  }
});
