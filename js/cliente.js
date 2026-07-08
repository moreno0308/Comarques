(function () {
  var CORES = { accent: '#6C4FD1', warm: '#8B7FE8', danger: '#C74B86' };
  var PALETA_DONUT = ['#6C4FD1', '#8B7FE8', '#C74B86', '#B9A8ED'];
  var ABAS = [
    { id: 'resumo', label: 'Resumo' },
    { id: 'contratos', label: 'Contratos' },
    { id: 'vagas', label: 'Vagas' },
    { id: 'equipe', label: 'Equipe' }
  ];
  var estado = { dados: null, aba: 'resumo' };
  var chartsAtivos = [];

  document.getElementById('btn-solicitar').addEventListener('click', entrar);
  document.getElementById('input-senha').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') entrar();
  });

  function entrar() {
    var email = document.getElementById('input-email').value.trim();
    var senha = document.getElementById('input-senha').value.trim();
    var msg = document.getElementById('msg-login');
    if (!email || !senha) { msg.textContent = 'Informe e-mail e senha.'; msg.className = 'mensagem erro'; return; }

    var btn = document.getElementById('btn-solicitar');
    btn.disabled = true; btn.textContent = 'Entrando…';
    msg.textContent = ''; msg.className = 'mensagem';

    chamarAppsScript({ action: 'cliente', email: email, senha: senha })
      .then(function (res) {
        btn.disabled = false; btn.textContent = 'Entrar';
        if (res.erro) { msg.textContent = res.erro; msg.className = 'mensagem erro'; return; }
        estado.dados = res;
        montarApp();
      })
      .catch(function (err) {
        btn.disabled = false; btn.textContent = 'Entrar';
        msg.textContent = err.message; msg.className = 'mensagem erro';
      });
  }

  function montarApp() {
    document.body.innerHTML =
      '<div class="app-shell">' +
      '<aside class="sidebar">' +
      '<div class="brand"><p class="eyebrow">Portal do cliente</p><strong>' + estado.dados.empresa + '</strong></div>' +
      '<nav id="nav-abas"></nav>' +
      '</aside>' +
      '<div class="main-area">' +
      '<header class="topbar"><h1 id="titulo-aba">Resumo</h1></header>' +
      '<main class="content-area" id="conteudo"></main>' +
      '</div></div>';

    var nav = document.getElementById('nav-abas');
    nav.innerHTML = ABAS.map(function (a, i) {
      return '<button data-aba="' + a.id + '" class="' + (a.id === estado.aba ? 'ativo' : '') + '">' +
        '<span class="n">' + String(i + 1).padStart(2, '0') + '</span><span>' + a.label + '</span></button>';
    }).join('');
    nav.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        estado.aba = btn.getAttribute('data-aba');
        nav.querySelectorAll('button').forEach(function (b) { b.classList.remove('ativo'); });
        btn.classList.add('ativo');
        document.getElementById('titulo-aba').textContent = ABAS.find(function (a) { return a.id === estado.aba; }).label;
        renderAba();
      });
    });
    renderAba();
  }

  function destruirGraficos() { chartsAtivos.forEach(function (c) { c.destroy(); }); chartsAtivos = []; }
  function criarChart(el, config) { var c = new Chart(el, config); chartsAtivos.push(c); return c; }

  function renderAba() {
    destruirGraficos();
    var fn = { resumo: renderResumo, contratos: renderContratos, vagas: renderVagas, equipe: renderEquipe }[estado.aba];
    fn();
  }

  function renderResumo() {
    var d = estado.dados, f = d.funil;
    document.getElementById('conteudo').innerHTML =
      '<div class="kpi-row">' +
      '<div class="kpi positivo"><div class="label">Total investido com a CoMarques</div><div class="value">' + formatarMoeda(d.totalPago) + '</div></div>' +
      '<div class="kpi"><div class="label">Colaboradores ativos</div><div class="value">' + formatarNumero(d.totalColaboradoresAtivos) + '</div></div>' +
      '<div class="kpi"><div class="label">Vagas com contratação</div><div class="value">' + formatarNumero(f.contratados) + '</div></div>' +
      '</div>' +
      '<div class="funil" style="margin-top:24px;">' +
      '<div class="funil-etapa"><div class="label">Candidatados</div><div class="value">' + formatarNumero(f.candidatados) + '</div></div>' +
      '<div class="funil-etapa"><div class="label">Entrevistados</div><div class="value">' + formatarNumero(f.entrevistados) + '</div></div>' +
      '<div class="funil-etapa"><div class="label">Contratados</div><div class="value">' + formatarNumero(f.contratados) + '</div></div>' +
      '</div>' +
      '<div class="card" style="margin-top:24px;"><h3>Evolução do investimento</h3><canvas id="chart-cliente" height="140"></canvas></div>';

    criarChart(document.getElementById('chart-cliente'), {
      type: 'line',
      data: {
        labels: d.evolucaoMensal.map(function (m) { return m.rotulo; }),
        datasets: [{ data: d.evolucaoMensal.map(function (m) { return m.valor; }), borderColor: CORES.accent, backgroundColor: 'rgba(108,79,209,0.12)', fill: true, tension: 0.3, pointRadius: 3 }]
      },
      options: { plugins: { legend: { display: false } } }
    });
  }

  function renderContratos() {
    var d = estado.dados;
    document.getElementById('conteudo').innerHTML = '<div class="card"><h3>Contratos / orçamentos</h3>' +
      tabela(['Categoria', 'Tipo', 'Valor', 'Status'], d.orcamentos.map(function (o) { return [o.categoria, o.tipo, formatarMoeda(o.valor), badge(o.status)]; })) +
      '</div>';
  }

  function renderVagas() {
    var d = estado.dados;
    document.getElementById('conteudo').innerHTML = '<div class="card"><h3>Vagas</h3>' +
      tabela(['Cargo', 'Status'], d.vagas.map(function (v) { return [v.cargo, badge(v.status)]; })) +
      '</div>';
  }

  function renderEquipe() {
    var d = estado.dados;
    document.getElementById('conteudo').innerHTML = '<div class="card"><h3>Seus colaboradores</h3>' +
      tabela(['Nome', 'Cargo', 'Salário atual', 'Situação'], d.colaboradores.map(function (c) {
        return [c.nome, c.cargo, formatarMoeda(c.salarioAtual), c.demissao ? badge('Desligado') : badge('Ativo')];
      })) + '</div>';
  }

  function tabela(cabecalhos, linhas) {
    if (!linhas.length) return '<p style="color:var(--muted);">Nenhum registro por aqui ainda.</p>';
    return '<table><thead><tr>' + cabecalhos.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr></thead>' +
      '<tbody>' + linhas.map(function (l) { return '<tr>' + l.map(function (v) { return '<td>' + v + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
  }

  function badge(status) {
    var s = String(status || '').toLowerCase();
    var classe = 'ok';
    if (s.indexOf('suspens') !== -1 || s.indexOf('reprov') !== -1 || s.indexOf('desliga') !== -1) classe = 'alerta';
    else if (s.indexOf('andamento') !== -1 || s.indexOf('aberto') !== -1) classe = 'pendente';
    return '<span class="badge ' + classe + '">' + status + '</span>';
  }
})();
