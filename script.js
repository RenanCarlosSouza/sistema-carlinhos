let listaEventos = JSON.parse(localStorage.getItem('carlinhosEventos')) || [];

function mostrarTela(idTela) {
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(idTela).classList.add('ativa');
    if (event && event.currentTarget) event.currentTarget.classList.add('active');

    if (idTela === 'meus-eventos') renderizarTabelaEventos();
    if (idTela === 'gastos') atualizarSelects('select-evento-gastos');
    if (idTela === 'analise-evento') atualizarSelects('select-evento-analise');
    if (idTela === 'dashboard') atualizarDashboard();
}

// --- DASHBOARD (SÓ CONTA PENDENTES) ---
function atualizarDashboard() {
    // Aqui está a alteração: Filtra apenas status 'Pendente' para contar
    const pendentes = listaEventos.filter(e => e.status === 'Pendente').length;
    document.getElementById('dash-qtd-eventos').innerText = pendentes;
}

// --- CRUD EVENTOS ---
function prepararNovoEvento() {
    document.getElementById('form-evento').reset();
    document.getElementById('evento-id').value = '';
    document.getElementById('titulo-form').innerText = "Novo Evento";
    mostrarTela('form-evento-tela');
}

function salvarEvento() {
    const id = document.getElementById('evento-id').value;
    const nome = document.getElementById('nome-evento').value;
    const data = document.getElementById('data-evento').value;
    const local = document.getElementById('local-evento').value;
    const status = document.getElementById('status-evento').value;
    const orcamento = parseFloat(document.getElementById('orcamento-previsto').value);
    const banco = document.getElementById('banco-evento').value;

    if (!nome || isNaN(orcamento)) { alert("Preencha Nome e Orçamento."); return; }

    if (id) {
        const index = listaEventos.findIndex(e => e.id == id);
        if (index !== -1) listaEventos[index] = { ...listaEventos[index], nome, data, local, status, orcamento, banco };
    } else {
        listaEventos.push({ id: Date.now(), nome, data, local, status, orcamento, banco, gastos: [] });
    }
    salvarNoLocalStorage();
    alert("Salvo!");
    mostrarTela('meus-eventos');
}

// --- TABELAS ORGANIZADAS ---
function renderizarTabelaEventos() {
    const tbodyPend = document.querySelector('#tabela-pendentes tbody');
    const tbodyConc = document.querySelector('#tabela-concluidos tbody');
    const tbodyCanc = document.querySelector('#tabela-cancelados tbody');

    tbodyPend.innerHTML = '';
    tbodyConc.innerHTML = '';
    tbodyCanc.innerHTML = '';

    if (listaEventos.length === 0) {
        tbodyPend.innerHTML = '<tr><td colspan="4" style="text-align:center">Nenhum evento cadastrado.</td></tr>';
        return;
    }

    listaEventos.forEach(ev => {
        const tr = document.createElement('tr');
        const botoes = `<button onclick="editarEvento(${ev.id})">EDITAR</button>
                        <button onclick="excluirEvento(${ev.id})" style="background:white; color:black; border:1px solid black;">X</button>`;

        tr.innerHTML = `<td><strong>${ev.nome}</strong></td>
                        <td>${ev.data ? new Date(ev.data).toLocaleDateString('pt-BR') : '-'}</td>
                        <td>R$ ${ev.orcamento.toFixed(2)}</td>
                        <td>${botoes}</td>`;

        // Distribuição inteligente nas tabelas
        if (ev.status === 'Concluido') {
            tbodyConc.appendChild(tr);
        } else if (ev.status === 'Cancelado') {
            tbodyCanc.appendChild(tr);
        } else {
            // Qualquer coisa que não seja concluído ou cancelado cai como Pendente
            tbodyPend.appendChild(tr);
        }
    });

    // Mensagens se a tabela estiver vazia
    if (tbodyPend.children.length === 0) tbodyPend.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#555;">Sem pendências.</td></tr>';
    if (tbodyConc.children.length === 0) tbodyConc.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#555;">Nenhum concluído.</td></tr>';
    if (tbodyCanc.children.length === 0) tbodyCanc.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#555;">---</td></tr>';
}

function editarEvento(id) {
    const ev = listaEventos.find(e => e.id == id);
    if (!ev) return;
    document.getElementById('evento-id').value = ev.id;
    document.getElementById('nome-evento').value = ev.nome;
    document.getElementById('data-evento').value = ev.data;
    document.getElementById('local-evento').value = ev.local;
    document.getElementById('status-evento').value = ev.status;
    document.getElementById('orcamento-previsto').value = ev.orcamento;
    document.getElementById('banco-evento').value = ev.banco;
    document.getElementById('titulo-form').innerText = "Editar Evento";
    mostrarTela('form-evento-tela');
}

function excluirEvento(id) {
    if (confirm("Excluir evento e seus gastos?")) {
        listaEventos = listaEventos.filter(e => e.id != id);
        salvarNoLocalStorage();
        renderizarTabelaEventos();
    }
}

// --- GASTOS ---
function atualizarSelects(idSelect) {
    const select = document.getElementById(idSelect);
    select.innerHTML = '';
    if (listaEventos.length === 0) {
        select.add(new Option("Nenhum evento", ""));
        if (idSelect === 'select-evento-gastos') document.getElementById('area-gastos').style.display = 'none';
        return;
    }
    listaEventos.forEach(ev => select.add(new Option(ev.nome, ev.id)));
    if (idSelect === 'select-evento-gastos') {
        document.getElementById('area-gastos').style.display = 'block';
        carregarGastosDoEvento();
    }
    if (idSelect === 'select-evento-analise') {
        document.getElementById('conteudo-analise').style.display = 'block';
        carregarAnaliseDoEvento();
    }
}

function adicionarGasto() {
    const idEvento = document.getElementById('select-evento-gastos').value;
    const desc = document.getElementById('desc-gasto').value;
    const categoria = document.getElementById('cat-gasto').value;
    const valor = parseFloat(document.getElementById('valor-gasto').value);

    const index = listaEventos.findIndex(e => e.id == idEvento);
    if (index !== -1 && desc && !isNaN(valor)) {
        listaEventos[index].gastos.push({ id: Date.now(), descricao: desc, categoria: categoria, valor: valor });
        salvarNoLocalStorage();
        document.getElementById('desc-gasto').value = '';
        document.getElementById('valor-gasto').value = '';
        carregarGastosDoEvento();
    } else { alert("Erro nos dados."); }
}

function carregarGastosDoEvento() {
    const idEvento = document.getElementById('select-evento-gastos').value;
    const ev = listaEventos.find(e => e.id == idEvento);
    const ul = document.getElementById('lista-gastos');
    ul.innerHTML = '';
    if (!ev) return;
    ev.gastos.forEach(g => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${g.descricao} <small>(${g.categoria})</small></span> 
                        <div><b>R$ ${g.valor.toFixed(2)}</b><button class="btn-excluir-gasto" onclick="removerGasto(${ev.id}, ${g.id})">X</button></div>`;
        ul.appendChild(li);
    });
}

function removerGasto(evtId, gastoId) {
    const idx = listaEventos.findIndex(e => e.id == evtId);
    if (idx !== -1) {
        listaEventos[idx].gastos = listaEventos[idx].gastos.filter(g => g.id != gastoId);
        salvarNoLocalStorage();
        carregarGastosDoEvento();
    }
}

// --- ANÁLISE INDIVIDUAL ---
function carregarAnaliseDoEvento() {
    const id = document.getElementById('select-evento-analise').value;
    const ev = listaEventos.find(e => e.id == id);
    if (!ev) return;
    const total = ev.gastos.reduce((a, b) => a + b.valor, 0);
    document.getElementById('analise-orcamento').innerText = `R$ ${ev.orcamento.toFixed(2)}`;
    document.getElementById('analise-gasto').innerText = `R$ ${total.toFixed(2)}`;
    document.getElementById('analise-saldo').innerText = `R$ ${(ev.orcamento - total).toFixed(2)}`;
}

// --- ANÁLISE MENSAL ---
function calcularAnaliseMensal() {
    const mesRef = document.getElementById('mes-referencia').value;
    const metaInput = document.getElementById('meta-mensal').value;
    const meta = parseFloat(metaInput);
    const divResult = document.getElementById('resultado-mensal');

    if (!mesRef || isNaN(meta)) { divResult.style.display = 'none'; return; }
    divResult.style.display = 'block';

    const eventosDoMes = listaEventos.filter(e => e.data && e.data.startsWith(mesRef));
    let totalGastoMes = 0;
    let melhorEvento = { nome: 'Nenhum', saldo: -Infinity };
    let categoriasMap = {};

    eventosDoMes.forEach(ev => {
        let gastoEvento = 0;
        ev.gastos.forEach(g => {
            gastoEvento += g.valor;
            categoriasMap[g.categoria] = (categoriasMap[g.categoria] || 0) + g.valor;
        });
        totalGastoMes += gastoEvento;
        let saldoEvento = ev.orcamento - gastoEvento;
        if (saldoEvento > melhorEvento.saldo) melhorEvento = { nome: ev.nome, saldo: saldoEvento };
    });

    let maiorCatNome = "---";
    let maiorCatValor = 0;
    for (const [cat, val] of Object.entries(categoriasMap)) {
        if (val > maiorCatValor) { maiorCatValor = val; maiorCatNome = cat; }
    }

    const semaforoBox = document.getElementById('semaforo-box');
    const semaforoTit = document.getElementById('semaforo-titulo');
    const semaforoMsg = document.getElementById('semaforo-msg');
    const previsaoTxt = document.getElementById('mensal-previsao');

    semaforoBox.className = '';
    let percentual = (totalGastoMes / meta) * 100;

    if (totalGastoMes > meta) {
        semaforoBox.classList.add('bg-vermelho');
        semaforoTit.innerText = "ORÇAMENTO ESTOURADO";
        semaforoMsg.innerText = `Excesso de R$ ${(totalGastoMes - meta).toFixed(2)}.`;
        previsaoTxt.innerText = "CUIDADO: Corte gastos supérfluos imediatamente. Risco alto.";
    } else if (percentual >= 80) {
        semaforoBox.classList.add('bg-amarelo');
        semaforoTit.innerText = "ATENÇÃO";
        semaforoMsg.innerText = `Uso de ${percentual.toFixed(1)}% da meta.`;
        previsaoTxt.innerText = "ALERTA: Evite novas despesas grandes. Reutilize materiais.";
    } else {
        semaforoBox.classList.add('bg-verde');
        semaforoTit.innerText = "DENTRO DA META";
        semaforoMsg.innerText = `Uso de ${percentual.toFixed(1)}%.`;
        previsaoTxt.innerText = "ÓTIMO: Empresa saudável. Considere investimentos.";
    }

    document.getElementById('mensal-total-gasto').innerText = `R$ ${totalGastoMes.toFixed(2)}`;
    document.getElementById('mensal-melhor-evento').innerText = eventosDoMes.length ? melhorEvento.nome : "---";
    document.getElementById('mensal-maior-categoria').innerText = maiorCatNome !== "---" ? `${maiorCatNome} (R$ ${maiorCatValor.toFixed(2)})` : "---";
}

function salvarNoLocalStorage() { localStorage.setItem('carlinhosEventos', JSON.stringify(listaEventos)); }
document.addEventListener('DOMContentLoaded', atualizarDashboard);