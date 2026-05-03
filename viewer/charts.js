(function () {
  'use strict';

  var D = window.SWIM_DATA;
  var TODAY = new Date('2026-05-02');

  var DISC_LABEL = {
    livre: 'Livre', costas: 'Costas', 'bruços': 'Bruços',
    mariposa: 'Mariposa', estilos: 'Estilos'
  };
  var DISC_ORDER = ['livre', 'costas', 'bruços', 'mariposa', 'estilos'];
  var TAB_TO_DISC = {
    livre: 'livre', costas: 'costas', brucos: 'bruços',
    mariposa: 'mariposa', estilos: 'estilos'
  };

  var state = { activeTab: 'geral', includeRelay: false, includeEstimated: false };

  /* ── Formatters ────────────────────────────────────────────────────── */

  function formatTime(s) {
    if (s == null) return '—';
    var m = Math.floor(s / 60);
    var sec = s % 60;
    var secStr = sec.toFixed(2);
    if (sec < 10) secStr = '0' + secStr;
    return m > 0 ? (m + ':' + secStr) : sec.toFixed(2);
  }

  function formatDate(iso) {
    if (!iso) return '—';
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0].slice(2);
  }

  function daysAgoText(iso) {
    var diff = Math.round((TODAY - new Date(iso)) / 86400000);
    if (diff === 0) return 'hoje';
    if (diff === 1) return 'ontem';
    return 'há ' + diff + ' dias';
  }

  function compLabel(cid) {
    var name = cid.replace(/^\d{4}-\d{2}-\d{2}_/, '').replace(/_/g, ' ');
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ── Filter ────────────────────────────────────────────────────────── */

  function filterEntries(entries) {
    return (entries || []).filter(function (e) {
      if (!state.includeRelay && e.is_relay_leg) return false;
      if (!state.includeEstimated && e.estimated) return false;
      return true;
    });
  }

  /* ── Sparkline SVG ─────────────────────────────────────────────────── */

  function sparkline(values, pbTime) {
    if (!values || values.length < 2) return '';
    var W = 100, H = 40, pad = 5;
    var mn = Math.min.apply(null, values);
    var mx = Math.max.apply(null, values);
    var range = mx - mn || 1;

    var pts = values.map(function (v, i) {
      return {
        x: pad + (i / (values.length - 1)) * (W - 2 * pad),
        // lower time → lower y value → top of SVG (inverted: better is lower on screen)
        y: H - pad - ((v - mn) / range) * (H - 2 * pad),
        v: v
      };
    });

    var poly = pts.map(function (p) {
      return p.x.toFixed(1) + ',' + p.y.toFixed(1);
    }).join(' ');

    var pbCircle = '';
    if (pbTime != null) {
      for (var i = 0; i < pts.length; i++) {
        if (pts[i].v === pbTime) {
          pbCircle = '<circle cx="' + pts[i].x.toFixed(1) + '" cy="' +
            pts[i].y.toFixed(1) + '" r="3" fill="var(--accent-pb)" ' +
            'stroke="var(--surface)" stroke-width="1.5"/>';
          break;
        }
      }
    }

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" ' +
      'style="width:100%;height:40px;display:block;overflow:visible">' +
      '<polyline points="' + poly + '" fill="none" stroke="var(--border)" ' +
      'stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      pbCircle + '</svg>';
  }

  /* ── Distance card ─────────────────────────────────────────────────── */

  function renderCard(disc, distStr) {
    var allEntries = (D.progression && D.progression[disc] && D.progression[disc][distStr]) || [];
    var entries = filterEntries(allEntries).filter(function (e) { return !e.dsq; });
    if (entries.length < 2) return '';

    var sorted = entries.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var last = sorted[sorted.length - 1];

    var pbEntry = D.pbs && D.pbs[disc] && D.pbs[disc][distStr];
    var pbTime = pbEntry ? pbEntry.time_s : null;
    var pbDate = pbEntry ? pbEntry.date : null;

    // Fallback: derive PB from filtered entries if missing from D.pbs
    if (pbTime == null) {
      sorted.forEach(function (e) {
        if (pbTime == null || e.time_s < pbTime) { pbTime = e.time_s; pbDate = e.date; }
      });
    }

    var isPBLast = (last.time_s === pbTime);

    var deltaHtml;
    if (isPBLast || pbTime == null) {
      deltaHtml = '<span class="delta neutral">—</span>';
    } else {
      var d = ((last.time_s - pbTime) / pbTime) * 100;
      var cls = d > 0 ? 'danger' : 'success';
      var arrow = d > 0 ? '▲' : '▼';
      var sign = d > 0 ? '+' : '';
      deltaHtml = '<span class="delta ' + cls + '">' + sign + d.toFixed(2) + '% ' + arrow + '</span>';
    }

    var lastLine = '';
    if (!isPBLast) {
      lastLine = '<div class="card-last">Última: <strong>' + formatTime(last.time_s) + '</strong></div>';
    }

    var values = sorted.map(function (e) { return e.time_s; });
    var spark = sparkline(values, pbTime);

    return '<div class="dist-card">' +
      '<div class="card-dist">' + distStr + 'm</div>' +
      '<div class="card-pb-row">' +
        '<span class="pb-time">' + esc(formatTime(pbTime)) + '</span>' +
        '<span class="pb-star">⭐</span>' +
      '</div>' +
      '<div class="card-pb-date">' + formatDate(pbDate) + '</div>' +
      lastLine +
      deltaHtml +
      '<div class="card-spark">' + spark + '</div>' +
    '</div>';
  }

  /* ── History table ─────────────────────────────────────────────────── */

  function renderHistorico(disc) {
    var discProg = (D.progression && D.progression[disc]) || {};
    var distances = Object.keys(discProg).map(Number).sort(function (a, b) { return a - b; });

    var rows = [];
    distances.forEach(function (dist) {
      var distStr = String(dist);
      var allEntries = discProg[distStr] || [];
      var entries = filterEntries(allEntries);
      var pbTime = D.pbs && D.pbs[disc] && D.pbs[disc][distStr] && D.pbs[disc][distStr].time_s;

      var sorted = entries.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });

      sorted.forEach(function (e, i) {
        var prev = sorted[i - 1];
        var deltaVsAnterior = prev != null ? ((e.time_s - prev.time_s) / prev.time_s) * 100 : null;

        var sr = null;
        if (dist >= 100 && D.splitsAnalysis && D.splitsAnalysis[disc] && D.splitsAnalysis[disc][distStr]) {
          var sa = D.splitsAnalysis[disc][distStr];
          for (var j = 0; j < sa.length; j++) {
            if (sa[j].competition_id === e.competition_id && sa[j].time_s === e.time_s) {
              sr = sa[j].speed_reserve_pct != null ? sa[j].speed_reserve_pct : null;
              break;
            }
          }
        }

        rows.push({ date: e.date, dist: dist, distStr: distStr, time_s: e.time_s,
          isPB: e.time_s === pbTime, deltaVsPB: e.delta_pct_vs_pb,
          deltaVsAnterior: deltaVsAnterior, sr: sr,
          dsq: !!e.dsq, estimated: !!e.estimated });
      });
    });

    rows.sort(function (a, b) {
      if (a.dist !== b.dist) return a.dist - b.dist;
      return a.date < b.date ? -1 : 1;
    });

    if (rows.length === 0) return '<p class="empty">Sem dados.</p>';

    var trs = rows.map(function (r) {
      var pbCell;
      if (r.isPB) {
        pbCell = '<td class="c-gold">⭐</td>';
      } else if (r.deltaVsPB != null) {
        var sign = r.deltaVsPB > 0 ? '+' : '';
        pbCell = '<td class="' + (r.deltaVsPB > 0 ? 'c-danger' : 'c-success') + '">' +
          sign + r.deltaVsPB.toFixed(2) + '%</td>';
      } else {
        pbCell = '<td>—</td>';
      }

      var prevCell;
      if (r.deltaVsAnterior != null) {
        var psign = r.deltaVsAnterior > 0 ? '+' : '';
        var pcls = r.deltaVsAnterior < 0 ? 'c-success' : (r.deltaVsAnterior > 0 ? 'c-danger' : '');
        prevCell = '<td class="' + pcls + '">' + psign + r.deltaVsAnterior.toFixed(2) + '%</td>';
      } else {
        prevCell = '<td>—</td>';
      }

      var srCell = (r.sr != null) ? '<td>' + r.sr.toFixed(1) + '%</td>' : '<td class="c-soft">—</td>';

      var badges = '';
      if (r.dsq) badges += '<span class="badge badge-dsq">DSQ</span>';
      if (r.estimated) badges += '<span class="badge badge-est">est</span>';

      return '<tr' + (r.dsq ? ' class="row-dsq"' : '') + '>' +
        '<td>' + formatDate(r.date) + '</td>' +
        '<td>' + r.distStr + 'm' + badges + '</td>' +
        '<td><strong>' + esc(formatTime(r.time_s)) + '</strong></td>' +
        pbCell + prevCell + srCell +
      '</tr>';
    }).join('');

    return '<div class="table-wrap">' +
      '<table class="data-table"><thead><tr>' +
        '<th>Data</th><th>Dist.</th><th>Tempo</th>' +
        '<th>Δ vs PB</th><th>Δ vs ant.</th>' +
        '<th title="Comparação contra PB actual">SR %</th>' +
      '</tr></thead><tbody>' + trs + '</tbody></table></div>';
  }

  /* ── Estilo section ────────────────────────────────────────────────── */

  function renderEstilo(disc) {
    var discProg = (D.progression && D.progression[disc]) || {};
    var distances = Object.keys(discProg).map(Number).sort(function (a, b) { return a - b; });

    var cards = distances.map(function (dist) {
      return renderCard(disc, String(dist));
    }).filter(Boolean);

    var cardsHtml = cards.length > 0
      ? '<div class="cards-grid">' + cards.join('') + '</div>'
      : '<p class="empty">Sem dados suficientes para cards.</p>';

    return '<div>' +
      '<h2 class="section-title">' + esc(DISC_LABEL[disc] || disc) + '</h2>' +
      cardsHtml +
      '<p class="sub-title">Histórico</p>' +
      renderHistorico(disc) +
    '</div>';
  }

  /* ── Geral section ─────────────────────────────────────────────────── */

  function renderGeral() {
    var a = D.athlete || {};
    var age = TODAY.getFullYear() - (a.birth_year || 2014);

    var athleteCard = '<div class="athlete-card">' +
      '<div class="athlete-name">' + esc(a.name || '—') + '</div>' +
      '<div class="athlete-meta">' + age + ' anos · ' + esc(a.club || '—') +
        ' · ' + esc(a.federation || '—') + '</div>' +
    '</div>';

    // PBs grid
    var pbRows = [];
    DISC_ORDER.forEach(function (disc) {
      var discPBs = (D.pbs && D.pbs[disc]) || {};
      Object.keys(discPBs).map(Number).sort(function (a, b) { return a - b; }).forEach(function (dist) {
        var pb = discPBs[String(dist)];
        pbRows.push('<tr>' +
          '<td>' + esc(DISC_LABEL[disc] || disc) + '</td>' +
          '<td>' + dist + 'm</td>' +
          '<td><strong>' + esc(formatTime(pb.time_s)) + '</strong></td>' +
          '<td>' + formatDate(pb.date) + '</td>' +
          '<td class="c-soft">' + daysAgoText(pb.date) + '</td>' +
        '</tr>');
      });
    });

    var pbTable = '<div class="table-wrap"><table class="data-table">' +
      '<thead><tr><th>Estilo</th><th>Dist.</th><th>PB</th><th>Data</th><th></th></tr></thead>' +
      '<tbody>' + pbRows.join('') + '</tbody></table></div>';

    // Competitions chronology from progression
    var compMap = {};
    DISC_ORDER.forEach(function (disc) {
      var discProg = (D.progression && D.progression[disc]) || {};
      Object.keys(discProg).forEach(function (distStr) {
        (discProg[distStr] || []).forEach(function (e) {
          var cid = e.competition_id;
          if (!compMap[cid]) compMap[cid] = { id: cid, date: e.date, count: 0 };
          compMap[cid].count++;
        });
      });
    });

    var comps = Object.values(compMap)
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; })
      .slice(0, 10);

    var compRows = comps.map(function (c) {
      return '<tr>' +
        '<td>' + formatDate(c.date) + '</td>' +
        '<td>' + esc(compLabel(c.id)) + '</td>' +
        '<td class="c-soft">' + c.count + ' prova' + (c.count !== 1 ? 's' : '') + '</td>' +
      '</tr>';
    }).join('');

    var compTable = '<div class="table-wrap"><table class="data-table">' +
      '<thead><tr><th>Data</th><th>Competição</th><th>Provas</th></tr></thead>' +
      '<tbody>' + compRows + '</tbody></table></div>';

    return '<div>' +
      athleteCard +
      '<p class="sub-title">PBs</p>' + pbTable +
      '<p class="sub-title">Últimas competições</p>' + compTable +
    '</div>';
  }

  /* ── Tab switching ─────────────────────────────────────────────────── */

  function renderTab(tabId) {
    var el = document.getElementById('tab-' + tabId);
    if (!el) return;
    if (tabId === 'geral') {
      el.innerHTML = renderGeral();
    } else {
      var disc = TAB_TO_DISC[tabId];
      if (disc) el.innerHTML = renderEstilo(disc);
    }
  }

  function activateTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll('.tab').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-content').forEach(function (sec) {
      sec.classList.toggle('active', sec.id === 'tab-' + tabId);
    });
    renderTab(tabId);
  }

  /* ── Init ──────────────────────────────────────────────────────────── */

  document.querySelectorAll('.tab').forEach(function (btn) {
    btn.addEventListener('click', function () { activateTab(btn.dataset.tab); });
  });

  document.getElementById('toggle-relay').addEventListener('change', function (e) {
    state.includeRelay = e.target.checked;
    renderTab(state.activeTab);
  });

  document.getElementById('toggle-estimated').addEventListener('change', function (e) {
    state.includeEstimated = e.target.checked;
    renderTab(state.activeTab);
  });

  activateTab('geral');
})();
