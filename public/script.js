const formatBRL = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

document.addEventListener("DOMContentLoaded", () => {
  initNavegacao();
  setupCalculoPedido();
  setupModais();
  lucide.createIcons();
  showRegioes();
  showClientes();
});

function initNavegacao() {
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

      if (typeof titulos !== "undefined" && titulos[target]) {
        document.getElementById("page-title").textContent = titulos[target][0];
        document.getElementById("page-subtitle").textContent = titulos[target][1];
      }

      lucide.createIcons();
    });
  });
}

function setupCalculoPedido() {
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

  if (inputQtd && inputPreco && inputComissao) {
    inputQtd.addEventListener("input", atualizarTotais);
    inputPreco.addEventListener("input", atualizarTotais);
    inputComissao.addEventListener("input", atualizarTotais);
  }

  const formPedido = document.getElementById("form-pedido");
  if (formPedido) {
    formPedido.addEventListener("submit", (e) => {
      e.preventDefault();
      console.log("Formulário de pedido submetido na interface.");
    });
  }
}

function setupModais() {
  const modalCli = document.getElementById("modal-cliente");
  const btnNovoCliente = document.getElementById("btn-novo-cliente");

  if (btnNovoCliente && modalCli) {
    btnNovoCliente.addEventListener("click", () => {
      modalCli.classList.add("active");
    });
  }

  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modalId = btn.dataset.close;
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.remove("active");
    });
  });

  const formCliente = document.getElementById("form-novo-cliente");
  if (formCliente) {
    formCliente.addEventListener("submit", (e) => {
      e.preventDefault();
      if (modalCli) modalCli.classList.remove("active");
      formCliente.reset();
    });
  }
}

async function showRegioes() {
  const selectElement = document.getElementById('rel1-select-regiao');
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
        totalPorRegiao(nomeSelecionado);
      }
    });
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
    console.log('Informações recebidas:', dados);

    renderizarInformacoes(dados);
  } catch (err) {
    console.error('Falha oa obter dados:', err.message);
  }
}

async function showClientes() {
  const selectElement = document.getElementById('rel2-select-clientes');
  try {
    const resposta = await fetch('/api/clientes');
    const clientes = await resposta.json();

    selectElement.innerHTML = '<option value="">Selecione um cliente...</option>';

    clientes.forEach(cliente => {
      const option = document.createElement('option');
      option.value = cliente.nome_razao_social;
      option.textContent = cliente.nome_razao_social;
      selectElement.appendChild(option);
    });
    selectElement.addEventListener('change', (event) => {
      const nomeSelecionado = event.target.value;
      if (nomeSelecionado) {
        totalPorCliente(nomeSelecionado);
      }
    });
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
        <td colspan="3" style="text-align: center;">Nenhuma venda encontrada para o cliente selecionada.</td>
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
    console.log('Informações recebidas:', dados);

    renderizarInformacoes2(dados);
  } catch (err) {
    console.error('Falha oa obter dados:', err.message);
  }
}