/* ═══════════════════════════════════════════════════════
   SegnalaOra — Statistiche
   ═══════════════════════════════════════════════════════ */

// CSV locali — generati da GitHub Actions ogni 30 min, già privi di dati personali
const SHEETS_CSV_APERTE  = 'dati/segnalazioni.csv';
const SHEETS_CSV_RISOLTE = 'dati/risolte.csv';

// ─────────────────────────────────────────────
//  CSV PARSING (condiviso con map.js)
// ─────────────────────────────────────────────
function splitCSVRows(text) {
  const rows = [];
  let rowStart = 0, inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { i++; }
      else inQuotes = !inQuotes;
    } else if (ch === '\n' && !inQuotes) {
      rows.push(text.slice(rowStart, i));
      rowStart = i + 1;
    }
  }
  const last = text.slice(rowStart);
  if (last.trim()) rows.push(last);
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else { current += ch; }
  }
  result.push(current);
  return result;
}

function parseCSV(text) {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const rows = splitCSVRows(normalized);
  if (rows.length < 2) return [];
  const headers = parseCSVLine(rows[0]);
  const reports = [];
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i].trim()) continue;
    const vals = parseCSVLine(rows[i]);
    const obj  = {};
    headers.forEach((h, idx) => {
      obj[h.trim()] = (vals[idx] !== undefined ? vals[idx] : '').trim();
    });
    if (!obj.Lat || isNaN(parseFloat(obj.Lat))) continue;
    reports.push(obj);
  }
  return reports;
}

// ─────────────────────────────────────────────
//  STATO GLOBALE
// ─────────────────────────────────────────────
let _allReports = [];

// Lista completa delle categorie (uguale al form di segnalazione)
const ALL_CATEGORIES = [
  { cat: 'Buche e dissesti stradali',     icon: 'fa-solid fa-road'               },
  { cat: 'Illuminazione pubblica guasta', icon: 'fa-solid fa-lightbulb'          },
  { cat: 'Rifiuti abbandonati',           icon: 'fa-solid fa-trash'              },
  { cat: 'Alberi e verde pubblico',       icon: 'fa-solid fa-tree'               },
  { cat: 'Perdite idriche',               icon: 'fa-solid fa-droplet'            },
  { cat: 'Deiezioni non raccolte',        icon: 'fa-solid fa-paw'                },
  { cat: 'Segnaletica danneggiata',       icon: 'fa-solid fa-triangle-exclamation'},
  { cat: 'Immobile pericolante',          icon: 'fa-solid fa-house-crack'        },
  { cat: 'Barriere architettoniche',      icon: 'fa-solid fa-wheelchair'         },
  { cat: 'Inquinamento acustico',         icon: 'fa-solid fa-volume-high'        },
  { cat: 'Veicoli abbandonati',           icon: 'fa-solid fa-car'                },
  { cat: 'Degrado e sicurezza',           icon: 'fa-solid fa-shield-halved'      },
  { cat: 'Altro',                         icon: 'fa-solid fa-ellipsis'           },
];

// ─────────────────────────────────────────────
//  CARICAMENTO DATI
// ─────────────────────────────────────────────
async function loadAll() {
  try {
    const t = Date.now();
    const bust = url => url.startsWith('http') ? url + '&t=' + t : url + '?t=' + t;
    const [r1, r2] = await Promise.all([
      fetch(bust(SHEETS_CSV_APERTE)),
      fetch(bust(SHEETS_CSV_RISOLTE))
    ]);
    const [t1, t2] = await Promise.all([r1.text(), r2.text()]);
    renderStats(parseCSV(t1), parseCSV(t2));
  } catch(e) {
    document.getElementById('loadingWrap').innerHTML =
      '<p style="color:#c0392b;padding:2rem;text-align:center">❌ Errore nel caricamento dei dati.</p>';
  }
}

// ─────────────────────────────────────────────
//  RENDER
// ─────────────────────────────────────────────
function renderStats(aperte, risolte) {
  _allReports = [...aperte, ...risolte];

  document.getElementById('loadingWrap').style.display  = 'none';
  document.getElementById('statsContent').style.display = 'block';

  populateCategoryFilter(_allReports);
  updateStatCards(_allReports);

  requestAnimationFrame(() => renderCharts(_allReports));
}

function updateStatCards(reports, filterLabel) {
  const totale  = reports.length;
  const aperte  = reports.filter(r => r.Stato !== 'Risolta' && r.Stato !== 'Chiusa').length;
  const alta    = reports.filter(r => r.Urgenza === 'Alta').length;
  const risolte = reports.filter(r => r.Stato === 'Risolta').length;

  const totaleGlob  = _allReports.length;
  const aperteGlob  = _allReports.filter(r => r.Stato !== 'Risolta' && r.Stato !== 'Chiusa').length;
  const altaGlob    = _allReports.filter(r => r.Urgenza === 'Alta').length;
  const risolteGlob = _allReports.filter(r => r.Stato === 'Risolta').length;

  const isFiltered = !!filterLabel;

  function setCard(numId, val, total) {
    const numEl = document.getElementById(numId);
    numEl.textContent = val;

    const existing = numEl.parentElement.querySelector('.sc-filter-badge');
    if (existing) existing.remove();

    if (isFiltered) {
      const badge = document.createElement('div');
      badge.className = 'sc-filter-badge';
      badge.textContent = `${val} di ${total} · ${filterLabel}`;
      numEl.parentElement.appendChild(badge);
    }
  }

  setCard('scTotale',  totale,  totaleGlob);
  setCard('scAperte',  aperte,  aperteGlob);
  setCard('scAlta',    alta,    altaGlob);
  setCard('scRisolte', risolte, risolteGlob);

  document.querySelectorAll('.stat-card').forEach(c => {
    c.classList.toggle('filtered', isFiltered);
  });
}

function populateCategoryFilter(reports) {
  const counts = {};
  reports.forEach(r => { if (r.Categoria) counts[r.Categoria] = (counts[r.Categoria] || 0) + 1; });

  const container = document.getElementById('catChips');
  container.innerHTML = '';

  // Chip "Tutte"
  const allChip = document.createElement('button');
  allChip.type = 'button';
  allChip.className = 'cat-chip active';
  allChip.dataset.cat = '';
  allChip.innerHTML = '<i class="fa-solid fa-layer-group"></i><span>Tutte</span>';
  allChip.addEventListener('click', () => filterByCategory(''));
  container.appendChild(allChip);

  // Chip per categoria definita
  ALL_CATEGORIES.forEach(({ cat, icon }) => {
    const n = counts[cat] || 0;
    if (!n) return;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'cat-chip';
    chip.dataset.cat = cat;
    chip.innerHTML = `<i class="${icon}"></i><span>${cat}${n > 0 ? ' <em>(${n})</em>' : ''}</span>`;
    chip.innerHTML = `<i class="${icon}"></i><span>${cat} <em>(${n})</em></span>`;
    chip.addEventListener('click', () => filterByCategory(cat));
    container.appendChild(chip);
  });

  // Categorie extra (non nella lista predefinita)
  Object.keys(counts)
    .filter(cat => !ALL_CATEGORIES.find(c => c.cat === cat))
    .forEach(cat => {
      const n = counts[cat];
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'cat-chip';
      chip.dataset.cat = cat;
      chip.innerHTML = `<i class="fa-solid fa-tag"></i><span>${cat} <em>(${n})</em></span>`;
      chip.addEventListener('click', () => filterByCategory(cat));
      container.appendChild(chip);
    });
}

function filterByCategory(cat) {
  // Aggiorna stato attivo delle chips
  document.querySelectorAll('.cat-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.cat === cat);
  });

  // Feedback visivo filter bar
  document.getElementById('filterBar').classList.toggle('active', !!cat);

  // Filtra dati
  const reports = cat ? _allReports.filter(r => r.Categoria === cat) : _allReports;

  // Aggiorna stat cards con dati filtrati
  updateStatCards(reports, cat || '');

  // Distruggi e ridisegna i grafici
  ['chartCategorie', 'chartUrgenza', 'chartStato', 'chartTrend'].forEach(id => {
    const existing = Chart.getChart(id);
    if (existing) existing.destroy();
  });

  renderCharts(reports);
}

function renderCharts(reports) {
  renderCategorieChart(reports);
  renderUrgenzaChart(reports);
  renderStatoChart(reports);
  renderTrendChart(reports);
}

// ─────────────────────────────────────────────
//  CHART 1 — Per categoria (bar orizzontale)
// ─────────────────────────────────────────────
function renderCategorieChart(reports) {
  const counts = {}, emojis = {};
  reports.forEach(r => {
    const cat = r.Categoria || 'Altro';
    counts[cat] = (counts[cat] || 0) + 1;
    if (r.Categoria_Emoji && !emojis[cat]) emojis[cat] = r.Categoria_Emoji;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const labels = sorted.map(([cat]) => cat);
  const data   = sorted.map(([, n]) => n);

  // Palette amber→teal in base alla posizione
  const palette = [
    '#d4820a','#e09a2a','#c07020','#f0b040','#b06010',
    '#3cb4d8','#2a9ec0','#4dcae0','#1a8aaa','#5ad0e8',
    '#3d5a47','#2d4435'
  ];
  const bgColors = sorted.map((_, i) => palette[i % palette.length]);

  // Altezza dinamica: 32px per barra + spazio per assi
  const barH  = 32;
  const wrapH = Math.max(180, sorted.length * barH + 40);
  document.getElementById('wrapCategorie').style.height = wrapH + 'px';

  const total = data.reduce((a, b) => a + b, 0);

  new Chart(document.getElementById('chartCategorie'), {
    type: 'bar',
    plugins: [ChartDataLabels],
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: bgColors,
        borderRadius: 5,
        borderSkipped: false,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { right: 76 } },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `  ${ctx.raw} segnalazioni` } },
        datalabels: {
          anchor: 'end',
          align: 'end',
          clip: false,
          formatter: val => {
            const pct = total ? Math.round(val / total * 100) : 0;
            return `${val}  (${pct}%)`;
          },
          font: { family: 'DM Sans', size: 10, weight: '600' },
          color: chartTickColor(),
          padding: { left: 6 },
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { stepSize: 1, font: { family: 'DM Sans', size: 11 }, color: chartTickColor() },
          grid: { color: chartGridColor() }
        },
        y: {
          ticks: { font: { family: 'DM Sans', size: 11 }, color: chartTickColor() },
          grid: { display: false }
        }
      }
    }
  });
}

// ─────────────────────────────────────────────
//  CHART 2 — Per urgenza (doughnut)
// ─────────────────────────────────────────────
function renderUrgenzaChart(reports) {
  const counts = { Alta: 0, Normale: 0, Bassa: 0 };
  reports.forEach(r => { if (r.Urgenza in counts) counts[r.Urgenza]++; });

  const total = reports.length || 1;

  new Chart(document.getElementById('chartUrgenza'), {
    type: 'doughnut',
    plugins: [ChartDataLabels, centerTextPlugin],
    data: {
      labels: ['Alta', 'Normale', 'Bassa'],
      datasets: [{
        data: [counts.Alta, counts.Normale, counts.Bassa],
        backgroundColor: ['#e53535', '#ff9900', '#3cb4d8'],
        borderColor: chartBorderColor(),
        borderWidth: 3,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { family: 'DM Sans', size: 11 }, padding: 10, boxWidth: 12, color: chartTickColor() }
        },
        tooltip: {
          callbacks: {
            label: ctx => `  ${ctx.label}: ${ctx.raw}  (${Math.round(ctx.raw / total * 100)}%)`
          }
        },
        datalabels: {
          display: ctx => total > 0 && ctx.dataset.data[ctx.dataIndex] / total >= 0.05,
          formatter: val => total ? Math.round(val / total * 100) + '%' : '',
          color: '#fff',
          font: { family: 'DM Sans', size: 11, weight: '700' },
          textShadowBlur: 4,
          textShadowColor: 'rgba(0,0,0,0.35)',
        }
      }
    }
  });
}

// ─────────────────────────────────────────────
//  CHART 3 — Per stato (doughnut)
// ─────────────────────────────────────────────
function renderStatoChart(reports) {
  const order  = ['Nuova', 'In lavorazione', 'Risolta', 'Chiusa'];
  const colors = ['#d4820a', '#3cb4d8', '#3d5a47', '#a8a090'];
  const counts = {};
  reports.forEach(r => {
    const s = r.Stato || 'Nuova';
    counts[s] = (counts[s] || 0) + 1;
  });
  const entries = order.filter(s => counts[s] > 0);

  const statoTotal = entries.reduce((a, s) => a + counts[s], 0);

  new Chart(document.getElementById('chartStato'), {
    type: 'doughnut',
    plugins: [ChartDataLabels, centerTextPlugin],
    data: {
      labels: entries,
      datasets: [{
        data: entries.map(s => counts[s]),
        backgroundColor: entries.map(s => colors[order.indexOf(s)]),
        borderColor: chartBorderColor(),
        borderWidth: 3,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { family: 'DM Sans', size: 11 }, padding: 10, boxWidth: 12, color: chartTickColor() }
        },
        tooltip: {
          callbacks: { label: ctx => `  ${ctx.label}: ${ctx.raw}  (${statoTotal ? Math.round(ctx.raw / statoTotal * 100) : 0}%)` }
        },
        datalabels: {
          display: ctx => statoTotal > 0 && ctx.dataset.data[ctx.dataIndex] / statoTotal >= 0.05,
          formatter: val => statoTotal ? Math.round(val / statoTotal * 100) + '%' : '',
          color: '#fff',
          font: { family: 'DM Sans', size: 11, weight: '700' },
          textShadowBlur: 4,
          textShadowColor: 'rgba(0,0,0,0.35)',
        }
      }
    }
  });
}

// ─────────────────────────────────────────────
//  CHART 4 — Andamento nel tempo (bar verticale)
// ─────────────────────────────────────────────
function renderTrendChart(reports) {
  // Raggruppa per data (DD/MM/YYYY → ordina come YYYYMMDD)
  const counts = {};
  reports.forEach(r => {
    const d = (r.Data || '').trim();
    if (d) counts[d] = (counts[d] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => {
    const da = a[0].split('/').reverse().join('');
    const db = b[0].split('/').reverse().join('');
    return da.localeCompare(db);
  });

  new Chart(document.getElementById('chartTrend'), {
    type: 'bar',
    plugins: [ChartDataLabels],
    data: {
      labels: sorted.map(([d]) => d),
      datasets: [{
        label: 'Segnalazioni',
        data: sorted.map(([, n]) => n),
        backgroundColor: 'rgba(212,130,10,0.75)',
        borderColor: '#d4820a',
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 22 } },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `  ${ctx.raw} segnalazioni` } },
        datalabels: {
          anchor: 'end',
          align: 'top',
          display: ctx => ctx.dataset.data[ctx.dataIndex] > 0,
          formatter: val => val,
          font: { family: 'DM Sans', size: 10, weight: '600' },
          color: chartTickColor(),
          padding: { bottom: 2 },
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, font: { family: 'DM Sans', size: 11 }, color: chartTickColor() },
          grid: { color: chartGridColor() }
        },
        x: {
          ticks: { font: { family: 'DM Sans', size: 10 }, maxRotation: 45, color: chartTickColor() },
          grid: { display: false }
        }
      }
    }
  });
}

// ─────────────────────────────────────────────
//  DARK MODE HELPERS
// ─────────────────────────────────────────────
function isDark() {
  return document.documentElement.classList.contains('dark');
}

function chartGridColor()   { return isDark() ? 'rgba(245,240,232,0.07)' : 'rgba(26,18,8,0.06)'; }
function chartTickColor()   { return isDark() ? 'rgba(245,240,232,0.5)'  : '#6b5e4e'; }
function chartBorderColor() { return isDark() ? '#1a1410' : '#f5f0e8'; }

// ─────────────────────────────────────────────
//  CENTER TEXT PLUGIN (doughnut)
// ─────────────────────────────────────────────
const centerTextPlugin = {
  id: 'centerText',
  beforeDraw(chart) {
    if (chart.config.type !== 'doughnut') return;
    const { ctx, chartArea } = chart;
    const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
    const cx = (chartArea.left + chartArea.right) / 2;
    const cy = (chartArea.top + chartArea.bottom) / 2;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 1.4rem 'DM Sans', sans-serif`;
    ctx.fillStyle = isDark() ? 'rgba(245,240,232,0.9)' : '#1a1208';
    ctx.fillText(total, cx, cy - 9);
    ctx.font = `0.65rem 'DM Sans', sans-serif`;
    ctx.fillStyle = chartTickColor();
    ctx.fillText('totale', cx, cy + 11);
    ctx.restore();
  }
};

// Aggiorna i colori degli assi di tutti i grafici attivi
function updateChartColors() {
  ['chartCategorie', 'chartUrgenza', 'chartStato', 'chartTrend'].forEach(id => {
    const chart = Chart.getChart(id);
    if (!chart) return;
    const grid = chartGridColor();
    const tick = chartTickColor();
    Object.values(chart.options.scales || {}).forEach(scale => {
      if (scale.grid)  scale.grid.color = grid;
      if (scale.ticks) scale.ticks.color = tick;
    });
    if (chart.options.plugins?.legend?.labels) {
      chart.options.plugins.legend.labels.color = tick;
    }
    // aggiorna borderColor delle doughnut (separatore fette)
    if (chart.data.datasets) {
      chart.data.datasets.forEach(ds => {
        if (ds.borderColor !== undefined) ds.borderColor = chartBorderColor();
      });
    }
    // aggiorna colore etichette datalabels sui bar chart (non doughnut, il cui colore è sempre #fff)
    if (chart.options.plugins?.datalabels && ['chartCategorie', 'chartTrend'].includes(id)) {
      chart.options.plugins.datalabels.color = tick;
    }
    chart.update();
  });
}

// Re-render completo al cambio tema (i grafici a barre e doughnut usano colori aggiornati)
document.addEventListener('themechange', function() {
  updateChartColors();
});

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
loadAll();
