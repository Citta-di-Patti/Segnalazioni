/* ═══════════════════════════════════════════════════════
   SegnalaOra — Statistiche
   ═══════════════════════════════════════════════════════ */

const SHEETS_CSV_APERTE  = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSsv5emsudeZOCiaREWWRFP14r5ZSmMW-WzwBTNv-aUitRaEb8mOy5dbm4KmBjpSwSSn2A-GAL7UGYz/pub?gid=1984873064&single=true&output=csv';
const SHEETS_CSV_RISOLTE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSsv5emsudeZOCiaREWWRFP14r5ZSmMW-WzwBTNv-aUitRaEb8mOy5dbm4KmBjpSwSSn2A-GAL7UGYz/pub?gid=790985167&single=true&output=csv';

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
  { cat: 'Buche e dissesti stradali',     emoji: '🕳️' },
  { cat: 'Illuminazione pubblica guasta', emoji: '💡'  },
  { cat: 'Rifiuti abbandonati',           emoji: '🗑️' },
  { cat: 'Alberi e verde pubblico',       emoji: '🌳'  },
  { cat: 'Perdite idriche',               emoji: '🚰'  },
  { cat: 'Deiezioni non raccolte',        emoji: '🐕'  },
  { cat: 'Segnaletica danneggiata',       emoji: '🚧'  },
  { cat: 'Immobile pericolante',          emoji: '🏚️' },
  { cat: 'Barriere architettoniche',      emoji: '♿'  },
  { cat: 'Inquinamento acustico',         emoji: '🔊'  },
  { cat: 'Veicoli abbandonati',           emoji: '🛺'  },
  { cat: 'Degrado e sicurezza',           emoji: '💊'  },
  { cat: 'Altro',                         emoji: '📦'  },
];

// ─────────────────────────────────────────────
//  CARICAMENTO DATI
// ─────────────────────────────────────────────
async function loadAll() {
  try {
    const t = Date.now();
    const [r1, r2] = await Promise.all([
      fetch(SHEETS_CSV_APERTE  + '&t=' + t),
      fetch(SHEETS_CSV_RISOLTE + '&t=' + t)
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

function updateStatCards(reports) {
  document.getElementById('scTotale').textContent  = reports.length;
  document.getElementById('scAperte').textContent  = reports.filter(r => r.Stato !== 'Risolta' && r.Stato !== 'Chiusa').length;
  document.getElementById('scAlta').textContent    = reports.filter(r => r.Urgenza === 'Alta').length;
  document.getElementById('scRisolte').textContent = reports.filter(r => r.Stato === 'Risolta').length;
}

function populateCategoryFilter(reports) {
  const counts = {};
  reports.forEach(r => { if (r.Categoria) counts[r.Categoria] = (counts[r.Categoria] || 0) + 1; });

  const sel = document.getElementById('catFilter');
  sel.innerHTML = '<option value="">— Tutte le categorie —</option>';

  ALL_CATEGORIES.forEach(({ cat, emoji }) => {
    const n   = counts[cat] || 0;
    const opt = document.createElement('option');
    opt.value       = cat;
    opt.textContent = emoji + '  ' + cat + (n > 0 ? '  (' + n + ')' : '');
    sel.appendChild(opt);
  });

  // Categorie extra presenti nei dati ma non nella lista predefinita
  Object.keys(counts)
    .filter(cat => !ALL_CATEGORIES.find(c => c.cat === cat))
    .forEach(cat => {
      const opt = document.createElement('option');
      opt.value       = cat;
      opt.textContent = '📌  ' + cat + '  (' + counts[cat] + ')';
      sel.appendChild(opt);
    });
}

function filterByCategory(cat) {
  // Aggiorna select se chiamata dal pulsante reset
  const sel = document.getElementById('catFilter');
  if (sel.value !== cat) sel.value = cat;

  // Feedback visivo filter bar
  document.getElementById('filterBar').classList.toggle('active', !!cat);

  // Filtra dati
  const reports = cat ? _allReports.filter(r => r.Categoria === cat) : _allReports;

  // Aggiorna stat cards con dati filtrati
  updateStatCards(reports);

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
  const labels = sorted.map(([cat]) => (emojis[cat] ? emojis[cat] + '  ' : '') + cat);
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

  new Chart(document.getElementById('chartCategorie'), {
    type: 'bar',
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
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `  ${ctx.raw} segnalazioni` } }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { stepSize: 1, font: { family: 'DM Sans', size: 11 } },
          grid: { color: 'rgba(26,18,8,0.06)' }
        },
        y: {
          ticks: { font: { family: 'DM Sans', size: 11 } },
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
    data: {
      labels: ['🔴 Alta', '🟠 Normale', '🔵 Bassa'],
      datasets: [{
        data: [counts.Alta, counts.Normale, counts.Bassa],
        backgroundColor: ['#e53535', '#ff9900', '#3cb4d8'],
        borderColor: '#f5f0e8',
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
          labels: { font: { family: 'DM Sans', size: 11 }, padding: 10, boxWidth: 12 }
        },
        tooltip: {
          callbacks: {
            label: ctx => `  ${ctx.label}: ${ctx.raw}  (${Math.round(ctx.raw / total * 100)}%)`
          }
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

  new Chart(document.getElementById('chartStato'), {
    type: 'doughnut',
    data: {
      labels: entries,
      datasets: [{
        data: entries.map(s => counts[s]),
        backgroundColor: entries.map(s => colors[order.indexOf(s)]),
        borderColor: '#f5f0e8',
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
          labels: { font: { family: 'DM Sans', size: 11 }, padding: 10, boxWidth: 12 }
        },
        tooltip: {
          callbacks: { label: ctx => `  ${ctx.label}: ${ctx.raw}` }
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
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `  ${ctx.raw} segnalazioni` } }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, font: { family: 'DM Sans', size: 11 } },
          grid: { color: 'rgba(26,18,8,0.06)' }
        },
        x: {
          ticks: { font: { family: 'DM Sans', size: 10 }, maxRotation: 45 },
          grid: { display: false }
        }
      }
    }
  });
}

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
loadAll();
