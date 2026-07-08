(function () {
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
        renderPortal(res);
      })
      .catch(function (err) {
        btn.disabled = false; btn.textContent = 'Entrar';
        msg.textContent = err.message; msg.className = 'mensagem erro';
      });
  }

  function renderPortal(d) {
    document.querySelector('.wrap').style.maxWidth = '980px';
    var f = d.funil;

    var html = '<section><div class="section-title"><h2>' + d.empresa + '</h2>' +
      '<span class="desc">' + (d.segmento || '') + '</span></div>' +
      '<div class="kpi-row">' +
      '<div class="kpi positivo"><div class="label">Total investido com a CoMarques</div><div class="value">' + formatarMoeda(d.totalPago) + '</div></div>' +
      '<div class="kpi"><div class="label">Colaboradores ativos</div><div class="value">' + formatarNumero(d.totalColaboradoresAtivos) + '</div></div>' +
      '<div class="kpi"><div class="label">Vagas com contratação</div><div class="value">' + formatarNumero(f.contratados) + '</div></div>' +
      '</div></section>';

    html += '<section><div class="section-title"><h2>Funil de recrutamento das suas vagas</h2></div>' +
      '<div class="funil">' +
      '<div class="funil-etapa"><div class="label">Candidatados</div><div class="value">' + formatarNumero(f.candidatados) + '</div></div>' +
      '<div class="funil-etapa"><div class="label">Entrevistados</div><div class="value">' + formatarNumero(f.entrevistados) + '</div></div>' +
      '<div class="funil-etapa"><div class="label">Contratados</div><div class="value">' + formatarNumero(f.contratados) + '</div></div>' +
      '</div></section>';

    html += '<section><div class="section-title"><h2>Evolução do investimento</h2></div>' +
      '<div class="card"><canvas id="chart-cliente" height="140"></canvas></div></section>';

    html += '<section><div class="section-title"><h2>Contratos / orçamentos</h2></div><div class="card">' +
      tabela(['Categoria', 'Tipo', 'Valor', 'Status'],
        d.orcamentos.map(function (o) { return [o.categoria, o.tipo, formatarMoeda(o.valor), badge(o.status)]; })) +
      '</div></section>';

    if (d.vagas.length) {
      html += '<section><div class="section-title"><h2>Vagas</h2></div><div class="card">' +
        tabela(['Cargo', 'Status'],
          d.vagas.map(function (v) { return [v.cargo, badge(v.status)]; })) +
        '</div></section>';
    }

    if (d.colaboradores.length) {
      html += '<section><div class="section-title"><h2>Seus colaboradores</h2></div><div class="card">' +
        tabela(['Nome', 'Cargo', 'Salário atual', 'Situação'],
          d.colaboradores.map(function (c) {
            return [c.nome, c.cargo, formatarMoeda(c.salarioAtual), c.demissao ? badge('Desligado') : badge('Ativo')];
          })) +
        '</div></section>';
    }

    document.getElementById('conteudo').innerHTML = html;

    new Chart(document.getElementById('chart-cliente'), {
      type: 'line',
      data: {
        labels: d.evolucaoMensal.map(function (m) { return m.rotulo; }),
        datasets: [{
          label: 'Valor pago',
          data: d.evolucaoMensal.map(function (m) { return m.valor; }),
          borderColor: '#6C4FD1',
          backgroundColor: 'rgba(108,79,209,0.12)',
          fill: true, tension: 0.3, pointRadius: 3
        }]
      },
      options: { plugins: { legend: { display: false } } }
    });
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
