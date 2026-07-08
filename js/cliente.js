(function () {
  var emailAtual = '';

  document.getElementById('btn-solicitar').addEventListener('click', solicitarCodigo);
  document.getElementById('input-email').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') solicitarCodigo();
  });

  function solicitarCodigo() {
    var email = document.getElementById('input-email').value.trim();
    var msg = document.getElementById('msg-login');
    if (!email) { msg.textContent = 'Informe um e-mail.'; msg.className = 'mensagem erro'; return; }

    var btn = document.getElementById('btn-solicitar');
    btn.disabled = true; btn.textContent = 'Enviando…';
    msg.textContent = ''; msg.className = 'mensagem';

    chamarAppsScript({ action: 'solicitarCodigo', email: email })
      .then(function (res) {
        btn.disabled = false; btn.textContent = 'Enviar código de acesso';
        if (res.erro) { msg.textContent = res.erro; msg.className = 'mensagem erro'; return; }
        emailAtual = email;
        renderFormCodigo(res.mensagem);
      })
      .catch(function (err) {
        btn.disabled = false; btn.textContent = 'Enviar código de acesso';
        msg.textContent = err.message; msg.className = 'mensagem erro';
      });
  }

  function renderFormCodigo(mensagem) {
    document.getElementById('conteudo').innerHTML =
      '<div class="estado" style="max-width:360px;margin:0 auto;text-align:left;">' +
      '<h2 style="text-align:center;">Digite o código</h2>' +
      '<p style="text-align:center;">' + mensagem + '</p>' +
      '<div style="margin-top:20px;">' +
      '<input type="text" id="input-codigo" placeholder="Código de 6 dígitos" maxlength="6">' +
      '<button id="btn-confirmar" style="width:100%;margin-top:10px;">Confirmar</button>' +
      '<p class="mensagem" id="msg-codigo"></p>' +
      '</div></div>';
    document.getElementById('btn-confirmar').addEventListener('click', confirmarCodigo);
    document.getElementById('input-codigo').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') confirmarCodigo();
    });
    document.getElementById('input-codigo').focus();
  }

  function confirmarCodigo() {
    var codigo = document.getElementById('input-codigo').value.trim();
    var msg = document.getElementById('msg-codigo');
    var btn = document.getElementById('btn-confirmar');
    btn.disabled = true; btn.textContent = 'Verificando…';

    chamarAppsScript({ action: 'cliente', email: emailAtual, codigo: codigo })
      .then(function (res) {
        if (res.erro) {
          btn.disabled = false; btn.textContent = 'Confirmar';
          msg.textContent = res.erro; msg.className = 'mensagem erro';
          return;
        }
        renderPortal(res);
      })
      .catch(function (err) {
        btn.disabled = false; btn.textContent = 'Confirmar';
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
          borderColor: '#2C5F5A',
          backgroundColor: 'rgba(44,95,90,0.12)',
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
