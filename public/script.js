const formatBRL = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const titulos = {
  "clientes": ["Carteira de Clientes", "Gestão de compradores corporativos e residenciais"],
  "vendedores": ["Quadro de Representantes", "Gestão de representantes comerciais por território"],
  "produtos": ["Catálogo de Produtos", "Equipamentos de climatização e controle de estoque"],
  "pedidos": ["Novo Pedido", "Emissão de pedidos de climatização"],
  "rel-regiao": ["Relatório 1: Total por Região", "Faturamento total consolidado por região comercial"],
  "rel-clientes": ["Relatório 2: Total por Cliente", "Valor total vendido para cada cliente"],
  "rel-vendedor": ["Relatório 3: Total por Vendedor", "Desempenho de vendas por representante"],
  "rel-clienteRegiao": ["Relatório 4: Clientes por Região", "Listagem de clientes de determinada região"],
  "rel-produtos": ["Relatório 5: Total por Produto", "Ranking de faturamento e volume por equipamento"],
  "rel-comissoes": ["Relatório 6: Extrato de Comissões", "Detalhamento de comissões por representante e produto"]
};

document.addEventListener("DOMContentLoaded", () => {
  setupCalculoPedido();
  setupModais();
  lucide.createIcons();
  showRegioes();
  showClientes();
  setupBuscaComissoes();
  setupMenuMobile();
  totalPorProduto();
  setupBuscaProdutos();
  setupBuscaVendedores();
  showRegioes2();
  showCidades();
  formCliente();
  carregarDadosNovoPedido();
});

function setupMenuMobile() {
  const sidebar = document.querySelector(".sidebar");
  const btnMenu = document.getElementById("menu-toggle");
  const btnClose = document.getElementById("sidebar-close");
  const backdrop = document.getElementById("sidebar-backdrop");

  const fecharMenu = () => {
    sidebar.classList.remove("open");
    backdrop.classList.remove("active");
    document.body.style.overflow = "";
    if (btnMenu) btnMenu.setAttribute("aria-expanded", "false");
  };

  const abrirMenu = () => {
    sidebar.classList.add("open");
    backdrop.classList.add("active");
    document.body.style.overflow = "hidden";
    if (btnMenu) btnMenu.setAttribute("aria-expanded", "true");
  };

  if (sidebar && btnMenu && backdrop) {
    btnMenu.addEventListener("click", () => {
      if (sidebar.classList.contains("open")) {
        fecharMenu();
      } else {
        abrirMenu();
      }
    });

    if (btnClose) {
      btnClose.addEventListener("click", fecharMenu);
    }

    backdrop.addEventListener("click", fecharMenu);

    document.querySelectorAll(".nav-btn").forEach(btn => {
      btn.addEventListener("click", fecharMenu);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && sidebar.classList.contains("open")) {
        fecharMenu();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 900 && sidebar.classList.contains("open")) {
        fecharMenu();
      }
    });
  }
}


document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".page-view").forEach(p => p.classList.remove("active"));

    btn.classList.add("active");
    const target = btn.dataset.page;
    const targetElement = document.getElementById(`page-${target}`);
    if (targetElement) {
      targetElement.classList.add("active");
    }

    if (titulos[target]) {
      document.getElementById("page-title").textContent = titulos[target][0];
      document.getElementById("page-subtitle").textContent = titulos[target][1];
    }

    lucide.createIcons();
  });
});

async function carregarDadosNovoPedido() {
  const selectCli = document.getElementById("ped-cliente");
  const selectTransfCli = document.getElementById("transf-cli-nome");
  const selectProd = document.getElementById("ped-produto");

  if (selectCli || selectTransfCli) {
    try {
      const resCli = await fetch("/api/clientes-vendedores");
      if (resCli.ok) {
        const clientes = await resCli.json();
        if (selectCli) {
          selectCli.innerHTML = '<option value="">Selecione o cliente cadastrado...</option>';
        }
        if (selectTransfCli) {
          selectTransfCli.innerHTML = '<option value="">Selecione o cliente...</option>';
        }
        clientes.forEach(c => {
          if (selectCli) {
            const opt = document.createElement("option");
            opt.value = c.id_cliente;
            opt.textContent = c.nome_razao_social;
            opt.dataset.idVendedor = c.id_vendedor;
            opt.dataset.nomeVendedor = c.vendedor;
            opt.dataset.nomeRegiao = c.nome_regiao;
            selectCli.appendChild(opt);
          }
          if (selectTransfCli) {
            const optTransf = document.createElement("option");
            optTransf.value = c.id_cliente;
            optTransf.dataset.nome = c.nome_razao_social;
            optTransf.textContent = c.nome_razao_social;
            selectTransfCli.appendChild(optTransf);
          }
        });
      }
    } catch (err) {
      console.error("Erro ao carregar clientes para pedido:", err.message);
    }
  }

  if (selectProd) {
    try {
      const resProd = await fetch("/api/produtos-catalogo");
      if (resProd.ok) {
        const produtos = await resProd.json();
        selectProd.innerHTML = '<option value="">Selecione o modelo do catálogo...</option>';
        produtos.forEach(p => {
          const opt = document.createElement("option");
          opt.value = p.id_produto;
          opt.textContent = p.descricao;
          opt.dataset.preco = p.preco_tabela;
          selectProd.appendChild(opt);
        });
      }
    } catch (err) {
      console.error("Erro ao carregar produtos para pedido:", err.message);
    }
  }
}

function setupCalculoPedido() {
  const selectCli = document.getElementById("ped-cliente");
  const inputVend = document.getElementById("ped-vendedor");
  const selectProd = document.getElementById("ped-produto");
  const inputQtd = document.getElementById("ped-qtd");
  const inputPreco = document.getElementById("ped-preco");
  const inputComissao = document.getElementById("ped-comissao");
  const previewTotal = document.getElementById("ped-preview-total");
  const previewComissao = document.getElementById("ped-preview-comissao");

  const atualizarTotais = () => {
    const qtd = parseInt(inputQtd.value) || 0;
    const preco = parseFloat(inputPreco.value) || 0;
    const comissaoPerc = parseFloat(inputComissao.value) || 0;

    const total = qtd * preco;
    const comissao = total * (comissaoPerc / 100);

    previewTotal.textContent = formatBRL(total);
    previewComissao.textContent = formatBRL(comissao);
  };

  if (selectCli && inputVend) {
    selectCli.addEventListener("change", (e) => {
      const opt = e.target.selectedOptions[0];
      if (opt && opt.value !== "") {
        inputVend.value = `${opt.dataset.nomeVendedor} (${opt.dataset.nomeRegiao})`;
        inputVend.dataset.idVendedor = opt.dataset.idVendedor;
      } else {
        inputVend.value = "";
        delete inputVend.dataset.idVendedor;
      }
    });
  }

  if (selectProd && inputPreco) {
    selectProd.addEventListener("change", (e) => {
      const opt = e.target.selectedOptions[0];
      if (opt && opt.value !== "" && opt.dataset.preco) {
        inputPreco.value = Number(opt.dataset.preco).toFixed(2);
      } else {
        inputPreco.value = "";
      }
      atualizarTotais();
    });
  }

  if (inputQtd && inputPreco && inputComissao) {
    inputQtd.addEventListener("input", atualizarTotais);
    inputPreco.addEventListener("input", atualizarTotais);
    inputComissao.addEventListener("input", atualizarTotais);
  }

  const formPedido = document.getElementById("form-pedido");
  if (formPedido) {
    formPedido.addEventListener("submit", async (e) => {
      e.preventDefault();

      const fk_cliente = parseInt(selectCli.value);
      const fk_vendedor = parseInt(inputVend.dataset.idVendedor);
      const fk_produto = parseInt(selectProd.value);
      const quantidade = parseInt(inputQtd.value);
      const preco_praticado = parseFloat(inputPreco.value);
      const percentual_comissao = parseFloat(inputComissao.value);

      if (!fk_cliente || !fk_vendedor || !fk_produto) {
        alert("Selecione um cliente e um equipamento válidos.");
        return;
      }

      try {
        const resposta = await fetch("/api/pedidos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fk_cliente,
            fk_vendedor,
            fk_produto,
            quantidade,
            preco_praticado,
            percentual_comissao
          })
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
          alert("Erro ao emitir pedido: " + (resultado.erro || "Falha na requisição"));
          return;
        }

        alert(`Pedido #${resultado.id_pedido} emitido com sucesso!`);
        formPedido.reset();
        inputVend.value = "";
        delete inputVend.dataset.idVendedor;
        atualizarTotais();
        totalPorProduto();
      } catch (err) {
        console.error("Erro ao enviar pedido:", err.message);
        alert("Erro de conexão ao emitir o pedido.");
      }
    });
  }
}

function setupModais() {
  const modalCli = document.getElementById("modal-cliente");
  const btnNovoCliente = document.getElementById("btn-novo-cliente");

  const modalTransfCli = document.getElementById("modal-transferir-cliente");
  const btnTransfCli = document.getElementById("btn-transferir-cliente");

  const modalVend = document.getElementById("modal-vendedor");
  const btnNovoVendedor = document.getElementById("btn-novo-vendedor");

  const modalMoverVend = document.getElementById("modal-mover-regiao-vendedor");
  const btnMoverVend = document.getElementById("btn-mover-regiao-vendedor");

  const modalRetirarVend = document.getElementById("modal-retirar-vendedor");
  const btnRetirarVend = document.getElementById("btn-retirar-vendedor");

  const modalProd = document.getElementById("modal-produto");
  const btnNovoProduto = document.getElementById("btn-novo-produto");

  const modalCancPed = document.getElementById("modal-cancelar-pedido");
  const btnCancPed = document.getElementById("btn-cancelar-pedido");

  if (btnNovoCliente && modalCli) {
    btnNovoCliente.addEventListener("click", () => {
      modalCli.classList.add("active");
    });
  }

  if (btnTransfCli && modalTransfCli) {
    btnTransfCli.addEventListener("click", () => {
      modalTransfCli.classList.add("active");
    });
  }

  if (btnNovoVendedor && modalVend) {
    btnNovoVendedor.addEventListener("click", () => {
      modalVend.classList.add("active");
    });
  }

  if (btnMoverVend && modalMoverVend) {
    btnMoverVend.addEventListener("click", () => {
      modalMoverVend.classList.add("active");
    });
  }

  if (btnRetirarVend && modalRetirarVend) {
    btnRetirarVend.addEventListener("click", () => {
      modalRetirarVend.classList.add("active");
    });
  }

  if (btnNovoProduto && modalProd) {
    btnNovoProduto.addEventListener("click", () => {
      modalProd.classList.add("active");
    });
  }

  if (btnCancPed && modalCancPed) {
    btnCancPed.addEventListener("click", () => {
      modalCancPed.classList.add("active");
    });
  }

  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modalId = btn.dataset.close;
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.remove("active");
    });
  });

  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("active");
      }
    });
  });

  const formTransfCliente = document.getElementById("form-transferir-cliente");
  if (formTransfCliente) {
    formTransfCliente.addEventListener("submit", async (e) => {
      e.preventDefault();
      const selectCli = document.getElementById("transf-cli-nome");
      const selectRegiao = document.getElementById("transf-cli-regiao");

      const valorCli = selectCli.value;
      const idCliente = !isNaN(Number(valorCli)) && valorCli !== "" ? Number(valorCli) : null;
      const nomeCli = selectCli.options[selectCli.selectedIndex]?.dataset?.nome ||
        selectCli.options[selectCli.selectedIndex]?.textContent ||
        valorCli;
      const idNovaRegiao = Number(selectRegiao.value);

      try {
        const resposta = await fetch("/api/clientes/regiao", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_cliente: idCliente,
            nome_razao_social: nomeCli,
            id_nova_regiao: idNovaRegiao
          })
        });

        if (!resposta.ok) {
          const erroDados = await resposta.json().catch(() => ({}));
          throw new Error(erroDados.erro || `Status ${resposta.status}`);
        }

        if (modalTransfCli) modalTransfCli.classList.remove("active");
        formTransfCliente.reset();
        await showClientes();
        await carregarDadosNovoPedido();
      } catch (err) {
        console.error("Falha ao transferir região no banco:", err.message);
        alert("Erro ao transferir cliente de região: " + err.message);
      }
    });
  }

  const formVendedor = document.getElementById("form-novo-vendedor");
  if (formVendedor) {
    formVendedor.addEventListener("submit", (e) => {
      e.preventDefault();
      const nome = document.getElementById("vend-nome").value;
      const doc = document.getElementById("vend-doc").value;
      const tel = document.getElementById("vend-tel").value || "Sem telefone";
      const email = document.getElementById("vend-email").value || "";
      const regiao = document.getElementById("vend-regiao").value;

      const gridVend = document.getElementById("grid-vendedores");
      if (gridVend) {
        const iniciais = nome
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map(p => p[0].toUpperCase())
          .join("");

        const card = document.createElement("div");
        card.className = "rep-card";
        card.dataset.vendedor = nome;
        card.innerHTML = `
          <div class="rep-header">
            <div class="rep-avatar">${iniciais || "RP"}</div>
            <div>
              <h4>${nome}</h4>
              <p class="subtitle">${doc}</p>
            </div>
          </div>
          <p class="subtitle">${tel}${email ? " • " + email : ""}</p>
          <span class="rep-tag">Região: ${regiao}</span>
          <div class="rep-actions">
            <button type="button" class="btn btn-secondary btn-card-mover">Mover Região</button>
            <button type="button" class="btn btn-danger btn-card-retirar">Retirar</button>
          </div>
        `;

        card.querySelector(".btn-card-mover").addEventListener("click", () => {
          const inputMoverNome = document.getElementById("mover-vend-nome");
          if (inputMoverNome) inputMoverNome.value = nome;
          if (modalMoverVend) modalMoverVend.classList.add("active");
        });

        card.querySelector(".btn-card-retirar").addEventListener("click", () => {
          const inputRetirarNome = document.getElementById("retirar-vend-nome");
          if (inputRetirarNome) inputRetirarNome.value = nome;
          if (modalRetirarVend) modalRetirarVend.classList.add("active");
        });

        gridVend.appendChild(card);
      }

      if (modalVend) modalVend.classList.remove("active");
      formVendedor.reset();
    });
  }

  const formMoverVendedor = document.getElementById("form-mover-regiao-vendedor");
  if (formMoverVendedor) {
    formMoverVendedor.addEventListener("submit", (e) => {
      e.preventDefault();
      const nomeVend = document.getElementById("mover-vend-nome").value.trim().toLowerCase();
      const novaRegiao = document.getElementById("mover-vend-regiao").value;

      document.querySelectorAll("#grid-vendedores .rep-card").forEach(card => {
        const h4 = card.querySelector("h4");
        const tag = card.querySelector(".rep-tag");
        if (h4 && h4.textContent.trim().toLowerCase() === nomeVend && tag) {
          tag.textContent = `Região: ${novaRegiao}`;
        }
      });

      if (modalMoverVend) modalMoverVend.classList.remove("active");
      formMoverVendedor.reset();
    });
  }

  const formRetirarVendedor = document.getElementById("form-retirar-vendedor");
  if (formRetirarVendedor) {
    formRetirarVendedor.addEventListener("submit", (e) => {
      e.preventDefault();
      const termoVend = document.getElementById("retirar-vend-nome").value.trim().toLowerCase();

      document.querySelectorAll("#grid-vendedores .rep-card").forEach(card => {
        if (card.textContent.toLowerCase().includes(termoVend)) {
          card.remove();
        }
      });

      if (modalRetirarVend) modalRetirarVend.classList.remove("active");
      formRetirarVendedor.reset();
    });
  }

  const formCancelarPedido = document.getElementById("form-cancelar-pedido");
  if (formCancelarPedido) {
    formCancelarPedido.addEventListener("submit", async (e) => {
      e.preventDefault();
      const idPedido = document.getElementById("canc-ped-id").value;
      try {
        await fetch(`/api/pedidos?id=${encodeURIComponent(idPedido)}`);
      } catch (err) {
        console.error("Erro ao solicitar cancelamento:", err.message);
      }
      if (modalCancPed) modalCancPed.classList.remove("active");
      formCancelarPedido.reset();
    });
  }

  const buscaCliente = document.getElementById("busca-cliente");
  if (buscaCliente) {
    buscaCliente.addEventListener("input", () => {
      filtrarPainelClientes();
    });
  }

  const buscaProduto = document.getElementById("busca-produto");
  if (buscaProduto) {
    buscaProduto.addEventListener("input", (e) => {
      const termo = e.target.value.toLowerCase().trim();
      document.querySelectorAll("#tbody-produtos tr").forEach(tr => {
        tr.style.display = tr.textContent.toLowerCase().includes(termo) ? "" : "none";
      });
    });
  }
}

async function showRegioes() {
  const selectElement = document.getElementById('rel1-select-regiao');
  const selectCliRegiao = document.getElementById('cli-regiao');
  const selectVendRegiao = document.getElementById('vend-regiao');
  const selectTransfCliRegiao = document.getElementById('transf-cli-regiao');
  const selectMoverVendRegiao = document.getElementById('mover-vend-regiao');
  try {
    const resposta = await fetch('/api/regioes');
    if (!resposta.ok) {
      throw new Error(`Erro na requisição: ${resposta.status}`);
    }
    const regioes = await resposta.json();
    if (!Array.isArray(regioes)) return;

    if (selectElement) {
      selectElement.innerHTML = '<option value="">Selecione uma região...</option>';
    }
    [selectCliRegiao, selectVendRegiao, selectTransfCliRegiao, selectMoverVendRegiao].forEach(sel => {
      if (sel) sel.innerHTML = '<option value="">Selecione...</option>';
    });

    regioes.forEach(regiao => {
      if (regiao.id_regiao !== undefined && regiao.nome_regiao) {
        mapaRegioes[regiao.id_regiao] = regiao.nome_regiao;
      }
      if (selectElement) {
        const option = document.createElement('option');
        option.value = regiao.nome_regiao;
        option.textContent = regiao.nome_regiao;
        selectElement.appendChild(option);
      }
      [selectCliRegiao, selectVendRegiao, selectTransfCliRegiao, selectMoverVendRegiao].forEach(sel => {
        if (sel) {
          const opt = document.createElement('option');
          opt.value = regiao.id_regiao;
          opt.textContent = regiao.nome_regiao;
          sel.appendChild(opt);
        }
      });
    });

    if (listaClientesCache.length > 0) {
      renderizarPainelClientes(listaClientesCache);
    }
    if (selectElement) {
      selectElement.addEventListener('change', (event) => {
        const nomeSelecionado = event.target.value;
        if (nomeSelecionado) {
          totalPorRegiao(nomeSelecionado);
        }
      });
    }
  } catch (err) {
    console.error('Erro ao carregar regiões no front-end:', err.message);
  }
}

const formatarMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

function renderizarInformacoes(dados) {
  const tbody = document.getElementById('tbody-rel1-regioes');
  if (!tbody) {
    console.error('Elemento #tbody-rel1-regio-regioes não encontrado.');
    return;
  }

  tbody.innerHTML = '';

  if (!dados || dados.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: center;">Nenhuma venda encontrada para a região selecionada.</td>
      </tr>
    `;
    return;
  }

  dados.forEach(item => {
    const tr = document.createElement('tr');

    const regiao = item.nome_regiao;
    const vendedor = item.nome_vendedor;
    const totalBruto = item.total_faturado;

    const valorNumerico = Number(totalBruto);
    const totalFormatado = !isNaN(valorNumerico)
      ? formatadorMoeda.format(valorNumerico)
      : totalBruto;

    tr.innerHTML = `
      <td>${regiao}</td>
      <td>${vendedor}</td>
      <td>${totalFormatado}</td>
    `;

    tbody.appendChild(tr);
  });
}

async function totalPorRegiao(nomeRegiao) {

  try {
    const rota = `/api/regioes/${encodeURIComponent(nomeRegiao)}`;
    const resposta = await fetch(rota);

    if (!resposta.ok) {
      throw new Error(`Erro na requisição: ${resposta.status}`);
    }

    const dados = await resposta.json();

    renderizarInformacoes(dados);
  } catch (err) {
    console.error('Falha oa obter dados:', err.message);
  }
}

let mapaCidades = {};
let mapaRegioes = {};
let listaClientesCache = [];

function extrairCampo(obj, chavesExatas, regexChave) {
  if (!obj) return undefined;
  for (const ch of chavesExatas) {
    if (obj[ch] !== undefined && obj[ch] !== null && obj[ch] !== '') return obj[ch];
  }
  if (regexChave) {
    for (const [k, v] of Object.entries(obj)) {
      if (regexChave.test(k) && v !== undefined && v !== null && v !== '') return v;
    }
  }
  return undefined;
}

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function obterDadosLinhaCliente(cliente) {
  const nome = extrairCampo(cliente, ['nome_razao_social', 'Cliente'], /razao|cliente/i) ?? cliente.nome ?? '-';
  const docBruto = extrairCampo(cliente, ['cpf_cnpj', 'CPF_CNPJ', 'documento', 'cpf', 'cnpj'], /cpf|cnpj|doc/i);
  const telBruto = extrairCampo(cliente, ['telefone', 'Telefone', 'tel', 'contato'], /tel|cel|fone|contato/i);
  const doc = docBruto ? formatarCpfCnpj(docBruto) : '-';
  const telefone = telBruto ? formatarTelefone(telBruto) : '-';

  const nomeCidadeDireto = extrairCampo(
    cliente,
    ['nome_cidade', 'NomeCidade', 'Cidade', 'cidade', 'nome', 'Nome', 'municipio', 'nome_municipio'],
    /^(?!.*(id|fk|cod)).*(cidad|municip)/i
  );
  const idCidade = extrairCampo(cliente, ['fk_cidade', 'id_cidade', 'cod_cidade'], /(id|fk|cod).*cidad|cidad.*(id|fk|cod)/i);
  const cidade = nomeCidadeDireto ?? (idCidade !== undefined ? (mapaCidades[idCidade] ?? idCidade) : '-');

  const nomeRegiaoDireto = extrairCampo(
    cliente,
    ['nome_regiao', 'NomeRegiao', 'Regiao', 'regiao'],
    /^(?!.*(id|fk|cod)).*regi/i
  );
  const idRegiao = extrairCampo(cliente, ['fk_regiao', 'id_regiao', 'cod_regiao'], /(id|fk|cod).*regi|regi.*(id|fk|cod)/i);
  const regiao = nomeRegiaoDireto ?? (idRegiao !== undefined ? (mapaRegioes[idRegiao] ?? idRegiao) : '-');

  return { nome, doc, telefone, cidade, regiao };
}

function filtrarPainelClientes() {
  const inputBusca = document.getElementById('busca-cliente');
  const termoBruto = inputBusca ? inputBusca.value.trim() : '';

  if (!termoBruto) {
    renderizarPainelClientes(listaClientesCache);
    return;
  }

  const termoNormalizado = normalizarTexto(termoBruto);
  const termoDigitos = termoBruto.replace(/\D/g, '');

  const filtrados = listaClientesCache.filter(cliente => {
    const { nome, doc, cidade } = obterDadosLinhaCliente(cliente);

    const bateNome = normalizarTexto(nome).includes(termoNormalizado);
    const bateCidade = normalizarTexto(cidade).includes(termoNormalizado);

    const docFormatado = normalizarTexto(doc);
    const docDigitos = String(doc).replace(/\D/g, '');
    const bateDoc = docFormatado.includes(termoNormalizado) ||
      (termoDigitos.length > 0 && docDigitos.includes(termoDigitos));

    return bateNome || bateDoc || bateCidade;
  });

  renderizarPainelClientes(filtrados);
}

function renderizarPainelClientes(clientes) {
  const tbody = document.getElementById('tbody-clientes');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!clientes || clientes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center;">Nenhum cliente encontrado.</td>
      </tr>
    `;
    return;
  }

  clientes.forEach(cliente => {
    const tr = document.createElement('tr');
    const { nome, doc, telefone, cidade, regiao } = obterDadosLinhaCliente(cliente);

    tr.innerHTML = `
      <td>${nome}</td>
      <td>${doc}</td>
      <td>${telefone}</td>
      <td>${cidade}</td>
      <td class="col-regiao">${regiao}</td>
    `;

    tbody.appendChild(tr);
  });
}

async function showClientes() {
  const selectElement = document.getElementById('rel2-select-clientes') || document.getElementById('rel2-select-cliente');
  const selectTransfCli = document.getElementById('transf-cli-nome');
  try {
    const resposta = await fetch('/api/clientes');
    if (!resposta.ok) {
      throw new Error(`Erro na requisição: ${resposta.status}`);
    }
    const clientes = await resposta.json();
    if (!Array.isArray(clientes)) return;

    listaClientesCache = clientes;
    renderizarPainelClientes(clientes);

    if (selectElement) {
      selectElement.innerHTML = '<option value="">Selecione um cliente...</option>';
    }
    if (selectTransfCli && selectTransfCli.options.length <= 1) {
      selectTransfCli.innerHTML = '<option value="">Selecione o cliente...</option>';
    }

    clientes.forEach(cliente => {
      if (selectElement) {
        const option = document.createElement('option');
        option.value = cliente.nome_razao_social;
        option.textContent = cliente.nome_razao_social;
        selectElement.appendChild(option);
      }
      if (selectTransfCli) {
        const idExtraido = extrairCampo(cliente, ['id_cliente', 'id', 'ID', 'cod_cliente'], /id.*cli|cli.*id|^id$/i);
        if (idExtraido !== undefined) {
          const optTransf = document.createElement('option');
          optTransf.value = idExtraido;
          optTransf.dataset.nome = cliente.nome_razao_social;
          optTransf.textContent = cliente.nome_razao_social;
          selectTransfCli.appendChild(optTransf);
        }
      }
    });

    if (selectElement) {
      selectElement.onchange = (event) => {
        const nomeSelecionado = event.target.value;
        if (nomeSelecionado) {
          totalPorCliente(nomeSelecionado);
        }
      };
    }
  } catch (err) {
    console.error('Erro ao carregar clientes no front-end:', err.message);
  }
}

const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

function renderizarInformacoes2(clientes) {
  const tbody = document.getElementById('tbody-rel2-clientes');
  if (!tbody) {
    console.error('Elemento #tbody-rel2-clientes não encontrado.');
    return;
  }

  tbody.innerHTML = '';

  if (!clientes || clientes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="2" style="text-align: center;">Nenhuma venda encontrada para o cliente selecionada.</td>
      </tr>
    `;
    return;
  }

  clientes.forEach(cliente => {
    const tr = document.createElement('tr');
    const nomeCliente = cliente.nome_razao_social;
    const montanteTotal = cliente.montante_total;

    const valorNumerico = Number(montanteTotal);
    const totalFormatado = !isNaN(valorNumerico)
      ? formatadorMoeda.format(valorNumerico)
      : montanteTotal;

    tr.innerHTML = `
      <td>${nomeCliente}</td>
      <td>${totalFormatado}</td>
    `;

    tbody.appendChild(tr);
  });
}

async function totalPorCliente(nomeCliente) {

  try {
    const rota = `/api/clientes/${encodeURIComponent(nomeCliente)}`;
    const resposta = await fetch(rota);

    if (!resposta.ok) {
      throw new Error(`Erro na requisição: ${resposta.status}`);
    }

    const dados = await resposta.json();

    renderizarInformacoes2(dados);
  } catch (err) {
    console.error('Falha oa obter dados:', err.message);
  }
}

function renderizarInformacoes6(dados) {
  const tbody = document.getElementById('tbody-rel6');
  const kpiFaturamento = document.getElementById('rel6-faturamento');
  const kpiComissao = document.getElementById('rel6-comissao');

  if (!tbody) {
    console.error('Elemento #tbody-rel6 não encontrado.');
    return;
  }

  tbody.innerHTML = '';
  kpiFaturamento.textContent = formatadorMoeda.format(0);
  kpiComissao.textContent = formatadorMoeda.format(0);

  if (!dados || dados.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-cell">Nenhuma comissão encontrada para o representante informado.</td>
      </tr>
    `;
    return;
  }

  let faturamentoTotal = 0;
  let comissaoTotal = 0;

  dados.forEach(item => {
    const tr = document.createElement('tr');

    const valorTotal = Number(item.ValorTotalPedido);
    const valorComissao = Number(item.ValorComissao);

    faturamentoTotal += valorTotal;
    comissaoTotal += valorComissao;

    tr.innerHTML = `
      <td>${item.vendedor}</td>
      <td>${item.produto}</td>
      <td>${item.TotalPedido}</td>
      <td>${formatadorMoeda.format(valorTotal)}</td>
      <td>${formatadorMoeda.format(valorComissao)}</td>
    `;

    tbody.appendChild(tr);
  });

  kpiFaturamento.textContent = formatadorMoeda.format(faturamentoTotal);
  kpiComissao.textContent = formatadorMoeda.format(comissaoTotal);
}

async function totalComissaoVendedor(nomeVendedor) {

  try {
    const rota = `/api/comissoes/${encodeURIComponent(nomeVendedor)}`;
    const resposta = await fetch(rota);

    if (!resposta.ok) {
      throw new Error(`Erro na requisição: ${resposta.status}`);
    }

    const dados = await resposta.json();

    renderizarInformacoes6(dados);
  } catch (err) {
    console.error('Falha ao obter dados:', err.message);
    const tbody = document.getElementById('tbody-rel6');
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-cell">Erro ao consultar: ${err.message}</td>
      </tr>
    `;
  }
}
function setupBuscaComissoes() {
  const inputBusca = document.getElementById('rel6-busca');

  if (inputBusca) {
    inputBusca.addEventListener('input', (event) => {
      const termo = event.target.value.trim();
      if (termo) {
        totalComissaoVendedor(termo);
      } else {
        renderizarInformacoes6([]);
      }
    });
  }
}

function renderizarInformacoes5(dados) {
  const tbody = document.getElementById('tbody-rel5');
  if (!tbody) {
    console.error('Elemento #tbody-rel5 não encontrado.');
    return;
  }
  tbody.innerHTML = '';
  if (!dados || dados.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="empty-cell">Nenhuma venda de produto encontrada.</td>
      </tr>
    `;
    return;
  }
  dados.forEach(item => {
    const tr = document.createElement('tr');

    const valorNumerico = Number(item.faturamento_total);
    const totalFormatado = !isNaN(valorNumerico)
      ? formatadorMoeda.format(valorNumerico)
      : item.faturamento_total;

    tr.innerHTML = `
      <td>${item.produto}</td>
      <td>${item.total_quantidade_vendida}</td>
      <td>${totalFormatado}</td>
    `;

    tbody.appendChild(tr);
  });
}
async function totalPorProduto(termo = '') {

  try {
    const rota = `/api/produtos?busca=${encodeURIComponent(termo)}`;
    const resposta = await fetch(rota);

    if (!resposta.ok) {
      throw new Error(`Erro na requisição: ${resposta.status}`);
    }

    const dados = await resposta.json();

    renderizarInformacoes5(dados);
  } catch (err) {
    console.error('Falha ao obter dados:', err.message);
    const tbody = document.getElementById('tbody-rel5');
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="empty-cell">Erro ao consultar: ${err.message}</td>
      </tr>
    `;
  }
}
function setupBuscaProdutos() {
  const inputBusca = document.getElementById('rel5-busca');

  if (inputBusca) {
    inputBusca.addEventListener('input', (event) => {
      totalPorProduto(event.target.value.trim());
    });
  }
}
function setupBuscaVendedores() {
  const inputBusca = document.getElementById('rel3-busca');

  if (inputBusca) {
    inputBusca.addEventListener('input', (event) => {
      const termo = event.target.value.trim();
      if (termo) {
        totalPorVendedor(termo);
      } else {
        renderizarInformacoes3([]);
      }
    });
  }
}

function renderizarInformacoes3(vendedores) {
  const tbody = document.getElementById('tbody-rel3');
  if (!tbody) {
    console.error('Elemento #tbody-rel3 não encontrado.');
    return;
  }

  tbody.innerHTML = '';

  if (!vendedores || vendedores.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: center;">Nenhuma venda encontrada para o vendedor selecionada.</td>
      </tr>
    `;
    return;
  }

  vendedores.forEach(vendedor => {
    const tr = document.createElement('tr');
    const nomeVendedor = vendedor.NomeVendedor;
    const totalVendido = vendedor.TotalVendido;

    const valorNumerico = Number(totalVendido);
    const totalFormatado = !isNaN(valorNumerico)
      ? formatadorMoeda.format(valorNumerico)
      : totalVendido;

    tr.innerHTML = `
      <td>${nomeVendedor}</td>
      <td>${totalFormatado}</td>
    `;

    tbody.appendChild(tr);
  });
}

async function totalPorVendedor(nomeVendedor) {

  try {
    const rota = `/api/vendedores/${encodeURIComponent(nomeVendedor)}`;
    const resposta = await fetch(rota);

    if (!resposta.ok) {
      throw new Error(`Erro na requisição: ${resposta.status}`);
    }

    const dados = await resposta.json();

    renderizarInformacoes3(dados);
  } catch (err) {
    console.error('Falha oa obter dados:', err.message);
  }
}

async function showRegioes2() {
  const selectElement = document.getElementById('rel4-select-regiao');
  try {
    const resposta = await fetch('/api/regioes');
    const regioes = await resposta.json();

    selectElement.innerHTML = '<option value="">Selecione uma região...</option>';

    regioes.forEach(regiao => {
      const option = document.createElement('option');
      option.value = regiao.nome_regiao;
      option.textContent = regiao.nome_regiao;
      selectElement.appendChild(option);
    });
    selectElement.addEventListener('change', (event) => {
      const nomeSelecionado = event.target.value;
      if (nomeSelecionado) {
        clientesPorRegiao(nomeSelecionado);
      }
    });
  } catch (err) {
    console.error('Erro ao carregar regiões no front-end:', err.message);
  }
}

function renderizarInformacoes4(clientes) {
  const tbody = document.getElementById('tbody-rel4-regioes');
  if (!tbody) {
    console.error('Elemento #tbody-rel4-regio-regioes não encontrado.');
    return;
  }

  tbody.innerHTML = '';

  if (!clientes || clientes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="1" style="text-align: center;">Nenhuma venda encontrada para a região selecionada.</td>
      </tr>
    `;
    return;
  }

  clientes.forEach(cliente => {
    const tr = document.createElement('tr');

    const nomeCliente = cliente.Cliente;

    tr.innerHTML = `
      <td>${nomeCliente}</td>
    `;

    tbody.appendChild(tr);
  });
}

async function clientesPorRegiao(nomeRegiao) {

  try {
    const rota = `/api/clientesPorRegiao/${encodeURIComponent(nomeRegiao)}`;
    const resposta = await fetch(rota);

    if (!resposta.ok) {
      throw new Error(`Erro na requisição: ${resposta.status}`);
    }

    const dados = await resposta.json();

    renderizarInformacoes4(dados);
  } catch (err) {
    console.error('Falha oa obter dados:', err.message);
  }
}


async function showCidades() {
  const selectCidade = document.getElementById("cli-cidade");
  if (!selectCidade) return;

  try {
    const resposta = await fetch("/api/cidades");
    if (!resposta.ok) {
      throw new Error(`Erro na requisição: ${resposta.status}`);
    }
    const cidades = await resposta.json();
    if (!Array.isArray(cidades)) return;

    selectCidade.innerHTML = '<option value="">Selecione uma cidade...</option>';

    cidades.forEach(cidade => {
      const option = document.createElement("option");
      const id = cidade.id_cidade;
      const nome = cidade.nome;
      if (id !== undefined && nome !== undefined) {
        mapaCidades[id] = nome;
      }
      option.value = id;
      option.textContent = nome;
      selectCidade.appendChild(option);
    });

    if (listaClientesCache.length > 0) {
      renderizarPainelClientes(listaClientesCache);
    }
  } catch (err) {
    console.error("Erro ao carregar cidades no front-end:", err.message);
  }
}

function formatarCpfCnpj(valor) {
  const digitos = String(valor || "").replace(/\D/g, "").slice(0, 14);

  if (digitos.length <= 11) {
    return digitos
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  return digitos
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatarTelefone(valor) {
  const digitos = String(valor || "").replace(/\D/g, "").slice(0, 11);

  if (digitos.length <= 10) {
    return digitos
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }

  return digitos
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

function formCliente() {
  const formulario = document.getElementById("form-novo-cliente");
  const modalCli = document.getElementById("modal-cliente");
  const inputDocCli = document.getElementById("cli-doc");
  const inputDocVend = document.getElementById("vend-doc");
  const inputTelCli = document.getElementById("cli-tel");
  const inputTelVend = document.getElementById("vend-tel");

  [inputDocCli, inputDocVend].forEach(input => {
    if (input) {
      input.addEventListener("input", (e) => {
        e.target.value = formatarCpfCnpj(e.target.value);
      });
    }
  });

  [inputTelCli, inputTelVend].forEach(input => {
    if (input) {
      input.addEventListener("input", (e) => {
        e.target.value = formatarTelefone(e.target.value);
      });
    }
  });

  if (!formulario) return;

  formulario.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nomeCliente = document.getElementById("cli-nome").value.trim();
    const cpf_cnpj = formatarCpfCnpj(document.getElementById("cli-doc").value);
    const telCliente = formatarTelefone(document.getElementById("cli-tel").value);
    const fkRegiao = Number(document.getElementById("cli-regiao").value);
    const fkCidade = Number(document.getElementById("cli-cidade").value);

    try {
      const resposta = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome_razao_social: nomeCliente,
          cpf_cnpj,
          telefone: telCliente,
          fk_regiao: fkRegiao,
          fk_cidade: fkCidade
        })
      });

      if (!resposta.ok) {
        const erroDados = await resposta.json().catch(() => ({}));
        throw new Error(erroDados.erro || `Status ${resposta.status}`);
      }

      if (modalCli) modalCli.classList.remove("active");
      formulario.reset();
      await showClientes();
      await carregarDadosNovoPedido();
    } catch (err) {
      console.error("Falha ao cadastrar cliente:", err.message);
      alert("Erro ao cadastrar cliente: " + err.message);
    }
  });
}