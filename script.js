// ==========================================================================
// 1. DADOS E INICIALIZAÇÃO
// ==========================================================================
let listaEventos = JSON.parse(localStorage.getItem('carlinhosEventos')) || [];
let listaReceitas = JSON.parse(localStorage.getItem('carlinhosReceitas')) || [];
let listaFixos = JSON.parse(localStorage.getItem('carlinhosFixos')) || [];
let metasMensais = JSON.parse(localStorage.getItem('carlinhosMetas')) || {};
let graficoInstance = null;
let graficoMensalInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    carregarTema();
    atualizarDashboard();
    renderizarListasCarteira();
});

// ==========================================================================
// 2. UTILITÁRIOS
// ==========================================================================
function alternarTema() {
    document.body.classList.toggle('dark-mode');
    const btn = document.getElementById('btn-tema');
    if (document.body.classList.contains('dark-mode')) {
        btn.innerText = '☀️'; localStorage.setItem('temaCarlinhos', 'escuro');
    } else {
        btn.innerText = '🌙'; localStorage.setItem('temaCarlinhos', 'claro');
    }
}
function carregarTema() {
    if (localStorage.getItem('temaCarlinhos') === 'escuro') {
        document.body.classList.add('dark-mode'); document.getElementById('btn-tema').innerText = '☀️';
    }
}

function notificar(mensagem, tipo = 'sucesso') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    let icone = '✅';
    if (tipo === 'erro') icone = '❌';
    if (tipo === 'aviso') icone = '⚠️';
    toast.className = `toast ${tipo}`;
    toast.innerHTML = `<span>${icone}</span> <span>${mensagem}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s ease forwards';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function mascaraMoeda(evento) {
    const onlyDigits = evento.value.replace(/\D/g, "").replace(/^0+/, "");
    if (onlyDigits === "") { evento.value = ""; return; }
    evento.value = (Number(onlyDigits) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function converterMoedaParaFloat(valorString) {
    if (!valorString) return 0;
    return parseFloat(valorString.replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
}
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function getIconeCategoria(cat) {
    const mapa = { 'Alimentacao': '🍔', 'Bebidas': '🍻', 'Entretenimento': '🎟️', 'Transporte': '🚗', 'Mercado': '🛒', 'Lazer': '🏖️', 'Presentes': '🎁', 'Outros': '📝', 'Assinatura': '📺', 'Casa': '🏠', 'Internet': '🌐', 'Servico': '💡', 'Educacao': '🎓' };
    return mapa[cat] || '🔹';
}
function getIconePagamento(pgto) {
    const mapa = { 'Credito': '💳 Crédito', 'Debito': '💳 Débito', 'Pix': '💠 Pix', 'Dinheiro': '💵 Dinheiro' };
    return mapa[pgto] || '💵 Dinheiro';
}
function calcularDiasRestantes(dataEvento) {
    if (!dataEvento) return "";
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const evento = new Date(dataEvento); evento.setHours(0, 0, 0, 0);
    const diff = Math.ceil((evento - hoje) / (1000 * 60 * 60 * 24));
    if (diff < 0) return "(Já passou)";
    if (diff === 0) return "🚨 É HOJE!";
    if (diff === 1) return "⏰ É Amanhã!";
    return `⏰ Faltam ${diff} dias`;
}

// ==========================================================================
// 3. NAVEGAÇÃO E DADOS
// ==========================================================================
function mostrarTela(idTela) {
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(idTela).classList.add('ativa');
    if (event && event.currentTarget && event.currentTarget.classList.contains('nav-btn')) event.currentTarget.classList.add('active');

    if (idTela === 'meus-eventos') renderizarTabelaEventos();
    if (idTela === 'gastos') atualizarSelects('select-evento-gastos');
    if (idTela === 'analise-evento') atualizarSelects('select-evento-analise');
    if (idTela === 'carteira') renderizarListasCarteira();
    if (idTela === 'dashboard') atualizarDashboard();
}

function salvarDados() {
    localStorage.setItem('carlinhosEventos', JSON.stringify(listaEventos));
    localStorage.setItem('carlinhosReceitas', JSON.stringify(listaReceitas));
    localStorage.setItem('carlinhosFixos', JSON.stringify(listaFixos));
    localStorage.setItem('carlinhosMetas', JSON.stringify(metasMensais));
    atualizarDashboard(); // AQUI ESTAVA O ERRO DE DIGITAÇÃO
}

function atualizarSelects(idSelect) {
    const sel = document.getElementById(idSelect);
    sel.innerHTML = '<option value="">Selecione...</option>';
    listaEventos.forEach(ev => sel.add(new Option(ev.nome, ev.id)));
    if (idSelect === 'select-evento-analise' && sel.value) carregarAnaliseDoEvento();
}

// ==========================================================================
// 4. CRUD EVENTOS
// ==========================================================================
function prepararNovoEvento() { document.getElementById('form-evento').reset(); document.getElementById('evento-id').value = ''; mostrarTela('form-evento-tela'); }

function salvarEvento() {
    const id = document.getElementById('evento-id').value;
    const nome = document.getElementById('nome-evento').value;
    const data = document.getElementById('data-evento').value;
    const local = document.getElementById('local-evento').value;
    const status = document.getElementById('status-evento').value;
    const orc = converterMoedaParaFloat(document.getElementById('orcamento-previsto').value);

    if (!nome) return notificar("Preencha o nome do evento!", "erro");
    const novo = { id: id ? Number(id) : Date.now(), nome, data, local, status, orcamento: orc, gastos: [] };

    if (id) {
        const idx = listaEventos.findIndex(e => e.id == id);
        if (idx !== -1) { novo.gastos = listaEventos[idx].gastos; listaEventos[idx] = novo; }
    } else listaEventos.push(novo);

    salvarDados();
    notificar("Evento salvo com sucesso!");
    mostrarTela('meus-eventos');
}

function editarEvento(id) {
    const ev = listaEventos.find(e => e.id == id);
    document.getElementById('evento-id').value = ev.id; document.getElementById('nome-evento').value = ev.nome;
    document.getElementById('data-evento').value = ev.data; document.getElementById('local-evento').value = ev.local; document.getElementById('status-evento').value = ev.status;
    document.getElementById('orcamento-previsto').value = ev.orcamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    mostrarTela('form-evento-tela');
}

function excluirEvento(id) { if (confirm("Excluir evento?")) { listaEventos = listaEventos.filter(e => e.id != id); salvarDados(); renderizarTabelaEventos(); } }

function renderizarTabelaEventos() {
    const tbodyP = document.querySelector('#tabela-pendentes tbody'); tbodyP.innerHTML = '';
    const tbodyC = document.querySelector('#tabela-concluidos tbody'); tbodyC.innerHTML = '';
    const tbodyX = document.querySelector('#tabela-cancelados tbody'); tbodyX.innerHTML = '';
    listaEventos.forEach(ev => {
        const total = (ev.gastos || []).reduce((a, b) => a + b.valor, 0);
        const dataF = ev.data ? new Date(ev.data).toLocaleDateString('pt-BR') : '-';
        const pct = ev.orcamento ? (total / ev.orcamento) * 100 : 0;
        let cor = pct < 80 ? 'prog-verde' : (pct <= 100 ? 'prog-amarelo' : 'prog-vermelho');
        const linha = `<tr><td><strong>${ev.nome}</strong></td><td>${dataF} ${ev.status === 'Pendente' ? `<br><small>${calcularDiasRestantes(ev.data)}</small>` : ''}</td><td><div style="font-size:0.8rem">${formatarMoeda(total)} / ${formatarMoeda(ev.orcamento)}</div><div class="barra-fundo"><div class="barra-cheia ${cor}" style="width:${Math.min(pct, 100)}%"></div></div></td><td><button class="nav-btn" onclick="editarEvento(${ev.id})">✏️</button><button class="nav-btn" style="color:var(--danger)" onclick="excluirEvento(${ev.id})">🗑️</button></td></tr>`;
        if (ev.status === 'Pendente') tbodyP.innerHTML += linha; else if (ev.status === 'Concluido') tbodyC.innerHTML += linha; else tbodyX.innerHTML += linha;
    });
}

// ==========================================================================
// 5. GASTOS E CARTEIRA
// ==========================================================================
function adicionarGasto() {
    const idEv = document.getElementById('select-evento-gastos').value;
    const desc = document.getElementById('desc-gasto').value;
    const cat = document.getElementById('cat-gasto').value;
    const pag = document.getElementById('pagto-gasto').value;
    const val = converterMoedaParaFloat(document.getElementById('valor-gasto').value);
    const idx = listaEventos.findIndex(e => e.id == idEv);

    if (idx !== -1 && desc && val) {
        listaEventos[idx].gastos.push({ id: Date.now(), descricao: desc, categoria: cat, pagamento: pag, valor: val });
        salvarDados();
        document.getElementById('desc-gasto').value = ''; document.getElementById('valor-gasto').value = '';
        carregarGastosDoEvento();
        notificar("Gasto adicionado!");
    } else { notificar("Preencha todos os campos.", "erro"); }
}
function carregarGastosDoEvento() {
    const id = document.getElementById('select-evento-gastos').value;
    const ul = document.getElementById('lista-gastos'); ul.innerHTML = '';
    const ev = listaEventos.find(e => e.id == id);
    document.getElementById('area-gastos').style.display = ev ? 'block' : 'none';
    if (ev) ev.gastos.forEach(g => ul.innerHTML += `<li><div><strong>${getIconeCategoria(g.categoria)} ${g.descricao}</strong><br><small>${getIconePagamento(g.pagamento)}</small></div><div style="text-align:right"><strong>${formatarMoeda(g.valor)}</strong><br><button class="btn-danger" style="padding:2px 8px; font-size:0.7rem;" onclick="removerGasto(${ev.id},${g.id})">X</button></div></li>`);
}
function removerGasto(eid, gid) { const idx = listaEventos.findIndex(e => e.id == eid); listaEventos[idx].gastos = listaEventos[idx].gastos.filter(g => g.id != gid); salvarDados(); carregarGastosDoEvento(); }

function adicionarReceita() {
    const desc = document.getElementById('desc-receita').value;
    const data = document.getElementById('data-receita').value;
    const valor = converterMoedaParaFloat(document.getElementById('valor-receita').value);
    if (desc && valor) {
        listaReceitas.push({ id: Date.now(), descricao: desc, data, valor });
        salvarDados();
        renderizarListasCarteira();
        document.getElementById('desc-receita').value = ''; document.getElementById('valor-receita').value = '';
        notificar("Receita adicionada!");
    } else { notificar("Preencha descrição e valor.", "erro"); }
}
function removerReceita(id) { if (confirm("Excluir?")) { listaReceitas = listaReceitas.filter(r => r.id !== id); salvarDados(); renderizarListasCarteira(); } }

function adicionarFixo() {
    const desc = document.getElementById('desc-fixo').value;
    const cat = document.getElementById('cat-fixo').value;
    const valor = converterMoedaParaFloat(document.getElementById('valor-fixo').value);
    if (desc && valor) {
        listaFixos.push({ id: Date.now(), descricao: desc, categoria: cat, valor });
        salvarDados();
        renderizarListasCarteira();
        document.getElementById('desc-fixo').value = ''; document.getElementById('valor-fixo').value = '';
        notificar("Conta fixa criada!");
    } else { notificar("Preencha descrição e valor.", "erro"); }
}
function removerFixo(id) { if (confirm("Excluir?")) { listaFixos = listaFixos.filter(f => f.id !== id); salvarDados(); renderizarListasCarteira(); } }

function renderizarListasCarteira() {
    const ulRec = document.getElementById('lista-receitas'); ulRec.innerHTML = '';
    listaReceitas.forEach(r => ulRec.innerHTML += `<li><div>${r.descricao}</div><div style="text-align:right"><strong style="color:var(--success)">+ ${formatarMoeda(r.valor)}</strong> <button class="btn-danger" style="padding:2px 5px; font-size:0.6rem" onclick="removerReceita(${r.id})">X</button></div></li>`);
    const ulFix = document.getElementById('lista-fixos'); ulFix.innerHTML = '';
    listaFixos.forEach(f => ulFix.innerHTML += `<li><div>${getIconeCategoria(f.categoria)} ${f.descricao}</div><div style="text-align:right"><strong style="color:var(--warning)">- ${formatarMoeda(f.valor)}</strong> <button class="btn-danger" style="padding:2px 5px; font-size:0.6rem" onclick="removerFixo(${f.id})">X</button></div></li>`);
}

// ==========================================================================
// 6. RELATÓRIOS
// ==========================================================================
function carregarAnaliseDoEvento() {
    const id = document.getElementById('select-evento-analise').value;
    const ev = listaEventos.find(e => e.id == id);
    const div = document.getElementById('conteudo-analise');
    if (!ev) { div.style.display = 'none'; return; }
    div.style.display = 'block';

    const total = (ev.gastos || []).reduce((a, b) => a + b.valor, 0);
    const saldo = ev.orcamento - total;
    document.getElementById('print-nome-evento').innerText = ev.nome;
    document.getElementById('analise-orcamento').innerText = formatarMoeda(ev.orcamento);
    document.getElementById('analise-gasto').innerText = formatarMoeda(total);
    document.getElementById('analise-saldo').innerText = formatarMoeda(saldo);

    const pct = ev.orcamento ? (total / ev.orcamento) * 100 : 0;
    const barra = document.getElementById('analise-barra-progresso');
    barra.className = `barra-cheia ${pct < 80 ? 'prog-verde' : pct <= 100 ? 'prog-amarelo' : 'prog-vermelho'}`;
    barra.style.width = `${Math.min(pct, 100)}%`;
    document.getElementById('analise-barra-texto').innerText = `${pct.toFixed(1)}% utilizado`;

    let categoriasMap = {}, pagamentosMap = {};
    (ev.gastos || []).forEach(g => {
        categoriasMap[g.categoria] = (categoriasMap[g.categoria] || 0) + g.valor;
        let pg = g.pagamento || 'Dinheiro'; pagamentosMap[pg] = (pagamentosMap[pg] || 0) + g.valor;
    });

    const ulRanking = document.getElementById('lista-ranking'); ulRanking.innerHTML = '';
    let rankArr = Object.entries(categoriasMap).sort((a, b) => b[1] - a[1]);
    rankArr.forEach(([cat, val]) => ulRanking.innerHTML += `<li><span>${getIconeCategoria(cat)} ${cat}</span><strong>${formatarMoeda(val)}</strong></li>`);

    const ulPagto = document.getElementById('lista-pagamentos'); ulPagto.innerHTML = '';
    Object.entries(pagamentosMap).forEach(([pg, val]) => ulPagto.innerHTML += `<li><span>${getIconePagamento(pg)}</span><strong>${formatarMoeda(val)}</strong></li>`);

    const ulPrint = document.getElementById('lista-print-gastos'); ulPrint.innerHTML = '';
    (ev.gastos || []).forEach(g => ulPrint.innerHTML += `<li><span>${g.descricao} (${getIconeCategoria(g.categoria)})</span><span>${formatarMoeda(g.valor)}</span></li>`);

    const ctx = document.getElementById('meuGrafico').getContext('2d');
    if (graficoInstance) graficoInstance.destroy();
    const isDark = document.body.classList.contains('dark-mode');
    graficoInstance = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: rankArr.map(x => x[0]), datasets: [{ data: rankArr.map(x => x[1]), backgroundColor: ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#e67e22'], borderWidth: 1, borderColor: isDark ? '#1e293b' : '#fff' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: isDark ? '#fff' : '#333' } } } }
    });
}

function calcularAnaliseMensal() {
    const mesRef = document.getElementById('mes-referencia').value;
    if (!mesRef) { document.getElementById('resultado-mensal').style.display = 'none'; return; }
    document.getElementById('resultado-mensal').style.display = 'block';

    const meta = metasMensais[mesRef] || 0;
    document.getElementById('meta-mensal').value = meta ? formatarMoeda(meta) : '';
    document.getElementById('print-mes-referencia').innerText = mesRef;

    // RECEITAS
    const entradas = listaReceitas.filter(r => r.data && r.data.substring(0, 7) === mesRef).reduce((acc, item) => acc + Number(item.valor), 0);
    // FIXOS
    const fixos = listaFixos.reduce((acc, item) => acc + Number(item.valor), 0);
    // EVENTOS
    const eventosDoMes = listaEventos.filter(e => e.data && e.data.substring(0, 7) === mesRef);
    let totalGastosEventos = 0; let categoriasMap = {};

    eventosDoMes.forEach(ev => {
        (ev.gastos || []).forEach(g => {
            totalGastosEventos += Number(g.valor);
            categoriasMap[g.categoria] = (categoriasMap[g.categoria] || 0) + Number(g.valor);
        });
    });
    listaFixos.forEach(f => categoriasMap[`Fixo: ${f.categoria}`] = (categoriasMap[`Fixo: ${f.categoria}`] || 0) + Number(f.valor));

    const totalSaidas = fixos + totalGastosEventos;
    const saldo = entradas - totalSaidas;

    document.getElementById('mensal-entradas').innerText = formatarMoeda(entradas);
    document.getElementById('mensal-saidas').innerText = formatarMoeda(totalSaidas);
    const elS = document.getElementById('mensal-saldo');
    elS.innerText = formatarMoeda(saldo); elS.style.color = saldo >= 0 ? 'var(--success)' : 'var(--danger)';

    // META
    const box = document.getElementById('semaforo-box');
    const bar = document.getElementById('mensal-barra-progresso');
    if (meta > 0) {
        const pct = (totalSaidas / meta) * 100;
        bar.style.width = `${Math.min(pct, 100)}%`;
        bar.className = `barra-cheia ${pct > 100 ? 'prog-vermelho' : pct > 80 ? 'prog-amarelo' : 'prog-verde'}`;
        document.getElementById('mensal-barra-texto').innerText = `${pct.toFixed(1)}% da meta`;
        box.className = pct > 100 ? 'bg-vermelho' : 'bg-verde';
        document.getElementById('semaforo-titulo').innerText = pct > 100 ? "ESTOUROU A META" : "DENTRO DA META";
        document.getElementById('semaforo-msg').innerText = pct > 100 ? `Excedeu ${formatarMoeda(totalSaidas - meta)}` : "Gastos sob controle.";
    } else {
        box.className = 'semaforo-neutro'; document.getElementById('semaforo-titulo').innerText = "SEM META";
        document.getElementById('semaforo-msg').innerText = "Defina um valor."; bar.style.width = '0%';
    }

    // GRÁFICO MENSAL
    const ctx = document.getElementById('graficoMensal').getContext('2d');
    if (graficoMensalInstance) graficoMensalInstance.destroy();
    const catsSorted = Object.entries(categoriasMap).sort((a, b) => b[1] - a[1]);
    const isDark = document.body.classList.contains('dark-mode');

    if (catsSorted.length > 0) {
        graficoMensalInstance = new Chart(ctx, {
            type: 'pie',
            data: { labels: catsSorted.map(i => i[0]), datasets: [{ data: catsSorted.map(i => i[1]), backgroundColor: ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#e67e22', '#95a5a6', '#34495e'], borderWidth: 1, borderColor: isDark ? '#1e293b' : '#fff' }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: isDark ? '#fff' : '#333' } } } }
        });
    }

    // LISTA TOP
    const ulTop = document.getElementById('lista-top-eventos'); ulTop.innerHTML = '';
    if (eventosDoMes.length === 0) ulTop.innerHTML = '<li style="justify-content:center; color:var(--text-secondary)">Sem eventos.</li>';
    else eventosDoMes.map(e => ({ nome: e.nome, val: (e.gastos || []).reduce((a, b) => a + Number(b.valor), 0) })).sort((a, b) => b.val - a.val).slice(0, 3).forEach((e, i) => { if (e.val > 0) ulTop.innerHTML += `<li><span>${i + 1}º ${e.nome}</span><strong>${formatarMoeda(e.val)}</strong></li>`; });

    const ulFix = document.getElementById('lista-fixos-mensal'); ulFix.innerHTML = '';
    listaFixos.forEach(f => ulFix.innerHTML += `<li>${f.descricao} <span>${formatarMoeda(Number(f.valor))}</span></li>`);
}

function salvarEMudarMeta() { const mes = document.getElementById('mes-referencia').value; const val = converterMoedaParaFloat(document.getElementById('meta-mensal').value); if (mes) { metasMensais[mes] = val; salvarDados(); calcularAnaliseMensal(); } }

function atualizarDashboard() {
    const ent = listaReceitas.reduce((a, b) => a + b.valor, 0);
    const evs = listaEventos.reduce((t, ev) => t + (ev.gastos || []).reduce((a, b) => a + b.valor, 0), 0);
    const fix = listaFixos.reduce((a, b) => a + b.valor, 0);
    const sal = ent - (evs + fix);
    document.getElementById('dash-saldo').innerText = formatarMoeda(sal);
    document.getElementById('dash-entradas').innerText = formatarMoeda(ent);
    document.getElementById('dash-saidas').innerText = formatarMoeda(evs + fix);
    document.getElementById('dash-saldo').style.color = sal >= 0 ? 'var(--success)' : 'var(--danger)';
}

function exportarDados() { const d = JSON.stringify({ eventos: listaEventos, receitas: listaReceitas, fixos: listaFixos, metas: metasMensais }); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([d], { type: 'application/json' })); a.download = `backup_${new Date().toISOString().slice(0, 10)}.json`; a.click(); }
function importarDados() { const f = document.getElementById('arquivo-backup').files[0]; if (f) { const r = new FileReader(); r.onload = e => { try { const d = JSON.parse(e.target.result); listaEventos = d.eventos || []; listaReceitas = d.receitas || []; listaFixos = d.fixos || []; metasMensais = d.metas || {}; salvarDados(); notificar("Restaurado!", "sucesso"); setTimeout(() => location.reload(), 1000); } catch (err) { notificar("Erro no arquivo.", "erro"); } }; r.readAsText(f); } else notificar("Selecione um arquivo.", "aviso"); }
function filtrarEventos() { const t = document.getElementById('busca-evento').value.toLowerCase(); document.querySelectorAll('tbody tr').forEach(tr => { tr.style.display = tr.innerText.toLowerCase().includes(t) ? '' : 'none'; }); }
function imprimirRelatorio() { window.print(); }
