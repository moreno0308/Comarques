(function () {
  var CHAVE_KEY = 'comarques_chave_interna';

  function pegarChaveSalva() {
    return localStorage.getItem(CHAVE_KEY) || '';
  }

  function carregar() {
    chamarAppsScript({ action: 'interno', chave: pegarChaveSalva() })
      .then(function (dados) {
        if (dados.erro) {
          if (dados.erro.indexOf('Chave') !== -1) {
            renderPedirChave(dados.erro);
          } else {
            renderErro(dados.erro);
          }
          return;
        }
        renderDashboard(dados);
      })
      .catch(function (err) { renderErro(err.message); });
  }

  function renderPedirChave(mensagem) {
    document.getElementById('conteudo').innerHTML =
      '<div class="estado">' +
      '<h2>Acesso protegido</h2>' +
      '<p>' + mensagem + '</p>' +
      '<div class="form-row" style="max-width:320px;margin:20px auto 0;">' +
      '<input type="text" id="input-chave" placeholder="Chave de acesso">' +
      '<button id="btn-entrar">Entrar</button>' +
      '</div></div>';
    document.getElementById('btn-entrar').addEventListener('click', function () {
      localStorage.setItem(CHAVE_KEY, document.getElementById('input-chave').value.trim());
      document.getElementById('conteudo').innerHTML = '<div class="estado"><h2>Carregando…</h2></div>';
      carregar();
    });
  }

  function renderErro(msg) {
    document.getElementById('conteudo').innerHTML =
      '<div class="estado"><h2>Não foi possível carregar</h2><p>' + msg + '</p></div>';
  }

  function renderDashboard(d) {
    document.getElementById('stamp-data').textContent = formatarDataHora(d.atualizadoEm);

    var f = d.funil;
    var taxaEntrev = f.candidatados ? Math.round((f.entrevistados / f.candidatados) * 100) : 0;
    var taxaContr = f.entrevistados ? Math.round((f.contratados / f.entrevistados) * 100) : 0;
    var maiorValor = d.topClientes.length ? d.topClientes[0].valor : 1;

    document.getElementById('conteudo').innerHTML =
      '<section>' + secTitle('01', 'Resultado financeiro', 'Todas as entradas e saídas da consultoria') +
      '<div class="kpi-row">' +
      kpi('Faturamento total', formatarMoeda(d.faturamentoTotal), 'positivo') +
      kpi('Despesas totais', formatarMoeda(d.despesaTotal), 'negativo') +
      kpi('Lucro', formatarMoeda(d.lucro), d.lucro >= 0 ? 'positivo' : 'negativo') +
      '</div></section>' +

      '<section>' + secTitle('02', 'Funil de recrutamento', f.vagasAbertas + ' vaga(s) em aberto') +
      '<div class="funil">' +
      funilEtapa('Candidatados', d.funil.candidatados, null) +
      funilEtapa('Entrevistados', d.funil.entrevistados, taxaEntrev + '% dos candidatados') +
      funilEtapa('Contratados', d.funil.contratados, taxaContr + '% dos entrevistados') +
      '</div></section>' +

      '<section>' + secTitle('03', 'Evolução e metas', 'Faturamento mês a mês') +
      '<div class="chart-grid">' +
      '<div class="card"><h3>Evolução mensal do faturamento</h3><canvas id="chart-evolucao" height="180"></canvas></div>' +
      '<div class="card"><h3>Meta vs. realizado</h3><canvas id="chart-meta" height="180"></canvas></div>' +
      '</div></section>' +

      '<section>' + secTitle('04', 'Top clientes', 'Por faturamento acumulado') +
      '<div class="card"><div class="ranking">' +
      d.topClientes.map(function (c, i) {
        var pct = Math.round((c.valor / maiorValor) * 100);
        return '<div>' +
          '<div class="nome-valor"><span>' + (i + 1) + '. ' + c.nome + '</span><span class="valor">' + formatarMoeda(c.valor) + '</span></div>' +
          '<div class="barra-bg"><div class="barra" style="width:' + pct + '%"></div></div>' +
          '</div>';
      }).join('') +
      '</div></div></section>';

    desenharGraficos(d);
  }

  function secTitle(num, titulo, desc) {
    return '<div class="section-title"><span class="num">' + num + '</span><h2>' + titulo + '</h2><span class="desc">' + desc + '</span></div>';
  }

  function kpi(label, valor, classe) {
    return '<div class="kpi ' + classe + '"><div class="label">' + label + '</div><div class="value">' + valor + '</div></div>';
  }

  function funilEtapa(label, valor, taxa) {
    return '<div class="funil-etapa"><div class="label">' + label + '</div><div class="value">' + formatarNumero(valor) + '</div>' +
      (taxa ? '<div class="taxa">' + taxa + '</div>' : '') + '</div>';
  }

  function desenharGraficos(d) {
    var corAccent = '#2C5F5A';
    var corWarm = '#B5762C';
    var corLinha = '#DCE0D7';

    new Chart(document.getElementById('chart-evolucao'), {
      type: 'line',
      data: {
        labels: d.evolucaoMensal.map(function (m) { return m.rotulo; }),
        datasets: [{
          label: 'Faturamento',
          data: d.evolucaoMensal.map(function (m) { return m.valor; }),
          borderColor: corAccent,
          backgroundColor: 'rgba(44,95,90,0.12)',
          fill: true,
          tension: 0.3,
          pointRadius: 3
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: corLinha }, ticks: { callback: function (v) { return 'R$ ' + v; } } },
          x: { grid: { display: false } }
        }
      }
    });

    new Chart(document.getElementById('chart-meta'), {
      data: {
        labels: d.metaVsRealizado.map(function (m) { return m.rotulo; }),
        datasets: [
          { type: 'bar', label: 'Meta', data: d.metaVsRealizado.map(function (m) { return m.meta; }), backgroundColor: '#EADFCB' },
          { type: 'line', label: 'Realizado', data: d.metaVsRealizado.map(function (m) { return m.realizado; }), borderColor: corWarm, tension: 0.3, pointRadius: 3 }
        ]
      },
      options: {
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: { grid: { color: corLinha } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  carregar();
})();
