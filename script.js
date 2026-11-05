const formatBRL = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

document.addEventListener("DOMContentLoaded", () => {
  initNavegacao();
  setupCalculoPedido();
  setupModais();
  lucide.createIcons();
  showRegioes();
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

      if (titulos[target]) {
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

async function showRegioes(){
  const selectElement = document.getElementById('rel2-select-regiao');

  try{
    const resposta = await fetch(/api/regioes);
    const regioes = await resposta.json; 

    selectElement.innerHTML = '<option value="">Selecione uma região...</option>';

    regioes.forEach(regiao => {
      const option = document.createElement('option');
      option.value = regiao.id_regiao;
      option.textContent = regiao.nome_regiao;
      selectElement.appendChild(option);
    });
  }catch(err){
    console.error('Erro ao carregar regiões no front-end:', err.message);
  }
}

