/* ═══════════════════════════════════════════════════════
   SegnalaOra — Form segnalazione civica
   Logica JavaScript estratta da segnalazione-civica.html
   ═══════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────
//  CONFIGURAZIONE — compila con i dati del tuo comune
// ─────────────────────────────────────────────
const CONFIG = {
  // URL del Google Apps Script distribuito come Web App
  // Istruzioni: apri dati/apps-script.gs → incollalo su script.google.com
  // → Distribuisci → Nuova distribuzione → App web → Chiunque → copia URL
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbwiLYj4k102Vamc5PuqYp6euSVnYJh61RtkgTGvXufbLV3R_r-j2MRCdlavPu2nCFvpmw/exec',

  // Dati del comune (personalizza)
  comune: {
    nome:         'Comune di [NOME]',
    emailTecnico: 'ufficio.tecnico@comune.it',
    emailPolizia: 'polizialocale@comune.it',
    whatsapp:     '',           // es: '+390000000000'
    twitter:      '@ComuneXX', // handle Twitter/X
    facebookPage: 'https://www.facebook.com/ComuneXX',
    siteUrl:      '',           // URL pubblico dell'app (per link nella segnalazione)
  },

  // URL dei fogli CSV (viste filtrate del foglio Main)
  sheetsCSVAperte:  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSsv5emsudeZOCiaREWWRFP14r5ZSmMW-WzwBTNv-aUitRaEb8mOy5dbm4KmBjpSwSSn2A-GAL7UGYz/pub?gid=1984873064&single=true&output=csv',
  sheetsCSVRisolte: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSsv5emsudeZOCiaREWWRFP14r5ZSmMW-WzwBTNv-aUitRaEb8mOy5dbm4KmBjpSwSSn2A-GAL7UGYz/pub?gid=790985167&single=true&output=csv',
  // Foglio sorgente: https://docs.google.com/spreadsheets/d/1Wy86M342so7EHLi3F-G5UNvXFq058Zr5EKAPhjNS3FM/edit

};

// ─────────────────────────────────────────────
//  STATO APP
// ─────────────────────────────────────────────
let map, marker;
let currentStep = 1;
let _areeAdmin          = [];  // da dati/aree_amministrative.json
let _socialData         = {}; // da dati/social.json
let _societaPartecipate = [];  // da dati/società_partecipate.json
let _ccAreas            = []; // aree aggiunte come CC (array di { email, nome })
let reportData = {
  lat: 41.9028,
  lng: 12.4964,
  address: '',
  via: '',
  civico: '',
  cap: '',
  comune: '',
  provincia: '',
  regione: '',
  fontePosizione: 'Manuale',
  accuratezza: '',
  exifLat: null,
  exifLng: null,
  photoResized: null,
  photoDims: '',
  hasPhoto: false,
};

// ─────────────────────────────────────────────
//  CARICAMENTO JSON (aree amministrative + social)
// ─────────────────────────────────────────────
async function initFromJSON() {
  try {
    const [r1, r2, r3] = await Promise.all([
      fetch('dati/aree_amministrative.json'),
      fetch('dati/social.json'),
      fetch('dati/società_partecipate.json')
    ]);
    _areeAdmin          = await r1.json();
    _socialData         = await r2.json();
    _societaPartecipate = await r3.json();
  } catch(e) {
    console.warn('JSON non caricati:', e);
  }
  populateAreaDropdown();
  populateSocialDropdown();
}

function normalizePlatform(name) {
  const n = name.toLowerCase();
  if (n.includes('facebook'))  return 'facebook';
  if (n.includes('twitter') || n.includes(' x')) return 'twitter';
  if (n.includes('instagram')) return 'instagram';
  if (n.includes('youtube'))   return 'youtube';
  if (n.includes('whatsapp'))  return 'whatsapp';
  return n.replace(/[^a-z]/g, '');
}

function platformEmoji(key) {
  return { facebook:'📘', twitter:'🐦', instagram:'📷', youtube:'▶️', whatsapp:'💬' }[key] || '🌐';
}

function _buildAreaOptions(sel) {
  // ── Aree Amministrative ──────────────────────────
  const grp1 = document.createElement('optgroup');
  grp1.label = 'Aree Amministrative';
  _areeAdmin.forEach((a, i) => {
    const opt = document.createElement('option');
    opt.value = 'area:' + i;
    opt.textContent = a.nome;
    grp1.appendChild(opt);
  });
  sel.appendChild(grp1);

  // ── Società Partecipate ──────────────────────────
  if (_societaPartecipate.length) {
    const grp2 = document.createElement('optgroup');
    grp2.label = 'Società Partecipate';
    _societaPartecipate.forEach((s, i) => {
      const opt = document.createElement('option');
      opt.value = 'societa:' + i;
      opt.textContent = s.nome;
      grp2.appendChild(opt);
    });
    sel.appendChild(grp2);
  }
}

// Normalizza i dati di un'area/società dal valore composto "src:index"
function _getAreaByValue(val) {
  if (!val) return null;
  const colon = val.indexOf(':');
  const src = val.substring(0, colon);
  const i   = parseInt(val.substring(colon + 1));
  if (src === 'area') {
    const a = _areeAdmin[i];
    if (!a) return null;
    return { nome: a.nome, email: a.email, pec: a.pec, indirizzo: a.indirizzo, telefono: a.telefono };
  }
  if (src === 'societa') {
    const s = _societaPartecipate[i];
    if (!s) return null;
    return {
      nome:       s.nome,
      nome_esteso: s.nome_esteso || '',
      email:      Array.isArray(s.email) ? s.email[0] : s.email,
      pec:        Array.isArray(s.pec)   ? s.pec[0]   : s.pec,
      indirizzo:  s.indirizzo,
      telefono:   s.telefono,
    };
  }
  return null;
}

function populateAreaDropdown() {
  _buildAreaOptions(document.getElementById('areaSelect'));
  _buildAreaOptions(document.getElementById('ccAreaSelect'));
}

// ── CC helpers ────────────────────────────────────────────
function addAreaAsCC() {
  const sel  = document.getElementById('ccAreaSelect');
  const area = _getAreaByValue(sel.value);
  if (!area || !area.email) { sel.value = ''; return; }
  // Evita duplicati e conflitto con destinatario principale
  if (_ccAreas.find(a => a.email === area.email)) { sel.value = ''; return; }
  _ccAreas.push({ email: area.email, nome: area.nome });
  sel.value = '';
  renderCCTags();
  updatePreview();
}

function removeCCArea(email) {
  _ccAreas = _ccAreas.filter(a => a.email !== email);
  renderCCTags();
  updatePreview();
}

function renderCCTags() {
  const wrap = document.getElementById('ccTags');
  wrap.innerHTML = _ccAreas.map(a => {
    const label = a.nome.length > 35 ? a.nome.substring(0, 35) + '…' : a.nome;
    return `<span class="cc-tag">${label}<button type="button" onclick="removeCCArea('${a.email}')" title="Rimuovi">×</button></span>`;
  }).join('');
}

function getCCEmails() {
  const fromAreas = _ccAreas.map(a => a.email);
  const field = document.getElementById('ccCustomEmails');
  const fromField = field
    ? field.value.split(',').map(e => e.trim()).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    : [];
  return [...new Set([...fromAreas, ...fromField])];
}

function _addSocialOptions(grp, socials) {
  socials.forEach(s => {
    const key = normalizePlatform(s.piattaforma);
    const opt = document.createElement('option');
    opt.value               = key;
    opt.dataset.url         = s.url    || '';
    opt.dataset.handle      = s.handle || '';
    opt.dataset.piattaforma = s.piattaforma;
    opt.textContent = platformEmoji(key) + '  ' + s.piattaforma + (s.handle ? '  ·  @' + s.handle : '');
    grp.appendChild(opt);
  });
}

function populateSocialDropdown() {
  const sel = document.getElementById('socialSelect');

  // ── Comune / Ente principale ──────────────────────────
  if ((_socialData.social || []).length) {
    const grp = document.createElement('optgroup');
    grp.label = _socialData.ente || 'Comune';
    _addSocialOptions(grp, _socialData.social);
    sel.appendChild(grp);
  }

  // ── Società Partecipate ──────────────────────────
  _societaPartecipate.forEach(soc => {
    if (!soc.social || !soc.social.length) return;
    const grp = document.createElement('optgroup');
    grp.label = soc.nome;
    _addSocialOptions(grp, soc.social);
    sel.appendChild(grp);
  });
}

function updateAreaInfo() {
  const sel  = document.getElementById('areaSelect');
  const info = document.getElementById('areaInfo');
  const area = _getAreaByValue(sel.value);
  if (!area) {
    info.innerHTML = '';
    info.classList.remove('visible');
    return;
  }
  const tel = (area.telefono || []).join(' · ');
  info.innerHTML = `
    ${area.nome_esteso ? `<div class="ai-row"><span class="ai-ico">🏢</span><span>${area.nome_esteso}</span></div>` : ''}
    <div class="ai-row"><span class="ai-ico">📍</span><span>${area.indirizzo || ''}</span></div>
    ${tel ? `<div class="ai-row"><span class="ai-ico">📞</span><span>${tel}</span></div>` : ''}
    <div class="ai-row"><span class="ai-ico">✉️</span><span>${area.email || ''}</span></div>
    ${area.pec ? `<div class="ai-row"><span class="ai-ico">🔒</span><span class="ai-pec">${area.pec}</span></div>` : ''}
  `;
  info.classList.add('visible');
  updatePreview();
}

// ─────────────────────────────────────────────
//  FOTO + RESIZE + EXIF
// ─────────────────────────────────────────────
function openCamera() {
  const input = document.getElementById('fileInput');
  input.setAttribute('capture', 'environment');
  input.click();
}

function openGallery() {
  const input = document.getElementById('fileInput');
  input.removeAttribute('capture');
  input.click();
}

document.getElementById('fileInput').addEventListener('change', async function(e) {
  const file = e.target.files[0];
  if (!file) return;

  // 1. Leggi EXIF GPS
  let exifInfo = '';
  try {
    const gps = await exifr.gps(file);
    if (gps && gps.latitude && gps.longitude) {
      reportData.exifLat = gps.latitude;
      reportData.exifLng = gps.longitude;
      document.getElementById('btnExif').style.display = 'flex';
      exifInfo = ' · 📸 GPS EXIF trovato!';
    }
  } catch(err) {
    // exifr non disponibile o nessun EXIF
  }

  // 2. Ridimensiona a max 1280px
  const img = new Image();
  const reader = new FileReader();
  reader.onload = ev => {
    img.onload = () => {
      const MAX = 1280;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const resized = canvas.toDataURL('image/jpeg', 0.85);
      reportData.photoResized = resized;
      reportData.photoDims = `${w}x${h}`;
      reportData.hasPhoto = true;

      document.getElementById('previewImg').src = resized;
      document.getElementById('photoZone').style.display = 'none';
      document.getElementById('photoPreview').style.display = 'block';

      const info = document.getElementById('photoInfo');
      info.textContent = `✓ ${w}×${h}px${exifInfo} · ${(resized.length * 0.75 / 1024).toFixed(0)} KB`;
      info.classList.add('visible');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

// ─────────────────────────────────────────────
//  MAPPA + GPS + GEOCODING
// ─────────────────────────────────────────────
function initMap() {
  if (map) return;
  map = L.map('map', { maxZoom: 20 }).setView([reportData.lat, reportData.lng], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map);

  marker = L.marker([reportData.lat, reportData.lng], { draggable: true }).addTo(map);
  marker.on('dragend', e => {
    const p = e.target.getLatLng();
    setPosition(p.lat, p.lng, 'Manuale');
  });

  map.on('click', e => {
    marker.setLatLng(e.latlng);
    setPosition(e.latlng.lat, e.latlng.lng, 'Manuale');
  });

  // Priorità: EXIF → GPS device
  if (reportData.exifLat) {
    useExifGps();
  } else {
    getGPS();
  }
}

function setPosition(lat, lng, fonte, accuratezza) {
  reportData.lat = lat;
  reportData.lng = lng;
  reportData.fontePosizione = fonte || 'Manuale';
  reportData.accuratezza = accuratezza || '';
  if (map) {
    map.setView([lat, lng], 17);
    marker.setLatLng([lat, lng]);
  }
  reverseGeocode(lat, lng);
}

function getGPS() {
  document.getElementById('geoText').textContent = 'Rilevamento GPS in corso...';
  if (!navigator.geolocation) {
    document.getElementById('geoText').textContent = 'GPS non disponibile — clicca sulla mappa';
    return;
  }
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude: lat, longitude: lng, accuracy } = pos.coords;
    setPosition(lat, lng, 'GPS', Math.round(accuracy));
    document.getElementById('geoText').textContent =
      `✓ Posizione GPS rilevata (±${Math.round(accuracy)}m)`;
  }, () => {
    document.getElementById('geoText').textContent =
      '⚠ GPS non disponibile — clicca sulla mappa per posizionare';
  }, { enableHighAccuracy: true, timeout: 10000 });
}

function useExifGps() {
  if (!reportData.exifLat) return;
  setPosition(reportData.exifLat, reportData.exifLng, 'EXIF');
  document.getElementById('geoText').textContent = '✓ Coordinate estratte dai metadati EXIF della foto';
}

function reverseGeocode(lat, lng) {
  fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`)
    .then(r => r.json())
    .then(data => {
      const a = data.address || {};
      reportData.via = a.road || a.pedestrian || a.footway || '';
      reportData.civico = a.house_number || '';
      reportData.cap = a.postcode || '';
      reportData.comune = a.city || a.town || a.village || a.municipality || '';
      reportData.provincia = a.county || a.state_district || '';
      reportData.regione = a.state || '';
      reportData.address = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      document.getElementById('addressInput').value = reportData.address;
      updatePreview();
    })
    .catch(() => {
      reportData.address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      document.getElementById('addressInput').value = reportData.address;
    });
}

// ─────────────────────────────────────────────
//  VALIDAZIONE INLINE CAMPI
// ─────────────────────────────────────────────
function showFieldError(fieldId, msg) {
  const el = document.getElementById(fieldId);
  const err = document.getElementById(fieldId + '-error');
  if (el)  el.classList.add('invalid');
  if (err) { if (msg) err.textContent = msg; err.classList.add('visible'); }
}

function clearFieldError(fieldId) {
  const el = document.getElementById(fieldId);
  const err = document.getElementById(fieldId + '-error');
  if (el)  el.classList.remove('invalid');
  if (err) err.classList.remove('visible');
}

function validateEmailField() {
  const val = document.getElementById('email').value.trim();
  if (!val || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
    if (val) showFieldError('email'); // mostra errore solo se ha digitato qualcosa
  } else {
    clearFieldError('email');
  }
}

// ─────────────────────────────────────────────
//  STEP NAVIGATION
// ─────────────────────────────────────────────
function goStep(n) {
  if (n === 4) {
    if (!document.getElementById('categoria').value) {
      alert('Seleziona una categoria prima di continuare.');
      return;
    }
    let hasError = false;
    const _nome = document.getElementById('nome').value.trim();
    if (!_nome) {
      showFieldError('nome', 'Inserisci il tuo nome o nickname.');
      hasError = true;
    }
    const _email = document.getElementById('email').value.trim();
    if (!_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(_email)) {
      showFieldError('email', _email ? 'Indirizzo email non valido (es: nome@dominio.it).' : 'L\'email è obbligatoria per ricevere la conferma di invio.');
      hasError = true;
    }
    if (hasError) {
      if (!_nome) document.getElementById('nome').focus();
      else document.getElementById('email').focus();
      return;
    }
  }

  currentStep = n;
  const cards = document.querySelectorAll('.section-card');
  cards.forEach((c, i) => c.classList.toggle('visible', i === n - 1));

  const steps = document.querySelectorAll('.step');
  steps.forEach((s, i) => {
    s.classList.remove('active', 'done');
    const stepNum = Math.floor(i / 2) + 1;
    if (stepNum < n) s.classList.add('done');
    if (stepNum === n) s.classList.add('active');
  });

  if (n === 2) setTimeout(initMap, 150);
  if (n === 4) updatePreview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─────────────────────────────────────────────
//  ANTEPRIMA MESSAGGIO
// ─────────────────────────────────────────────
function updatePreview() {
  const cat = document.getElementById('categoria').value || '[categoria]';
  const descr = document.getElementById('descr').value;
  const nome = document.getElementById('nome').value || 'Un cittadino';
  const addr = document.getElementById('addressInput')?.value || reportData.address || '[posizione]';
  const urgenza = document.getElementById('urgenza')?.value || 'Normale';

  const urgLabel = urgenza === 'Alta' ? '🔴 URGENTE — ' : urgenza === 'Bassa' ? '🟢 ' : '🟡 ';
  const addrShort = addr.length > 80 ? addr.substring(0, 80) + '...' : addr;

  let msg = `📍 <strong>Segnalazione Civica — ${urgLabel}${cat}</strong><br>`;
  msg += `📌 Luogo: ${addrShort}<br>`;
  if (descr) msg += `📝 Note: ${descr}<br>`;
  msg += `👤 Segnalato da: ${nome}<br>`;
  msg += `🕐 ${new Date().toLocaleString('it-IT')}<br>`;
  msg += `<br><em>#SegnalaOra #${cat.replace(/[^a-zA-Z]/g,'')}</em>`;

  document.getElementById('previewBox').innerHTML = msg;
}

// ─────────────────────────────────────────────
//  INVIO
// ─────────────────────────────────────────────
async function sendReport() {
  const cat = document.getElementById('categoria').value;
  if (!cat) { alert('Seleziona una categoria.'); return; }

  const nome = document.getElementById('nome').value.trim();
  const emailSegnalante = document.getElementById('email').value.trim();
  if (!nome || !emailSegnalante || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailSegnalante)) {
    if (!nome) showFieldError('nome');
    if (!emailSegnalante || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailSegnalante)) showFieldError('email');
    return;
  }

  // Area amministrativa / società partecipata selezionata e social
  const areaData = _getAreaByValue(document.getElementById('areaSelect').value);
  const socialSel = document.getElementById('socialSelect');
  const socialKey = socialSel.value;
  const socialOpt = socialKey ? socialSel.selectedOptions[0] : null;

  const btn = document.getElementById('sendBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Invio in corso...';

  const now      = new Date();
  const ticketId = 'SGN-' + now.getTime();

  // Token segreto monouso — non finisce mai nel CSV pubblico, solo nell'email alla PA
  const token = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'xxxx-xxxx-xxxx-xxxx'.replace(/x/g, () =>
        (Math.random() * 16 | 0).toString(16));

  const descr   = document.getElementById('descr').value;
  const urgenza = document.getElementById('urgenza').value;
  const addr    = document.getElementById('addressInput').value || reportData.address;

  const emojiMap = {
    'Buche e dissesti stradali': '🕳️', 'Illuminazione pubblica guasta': '💡',
    'Rifiuti abbandonati': '🗑️',        'Alberi e verde pubblico': '🌳',
    'Perdite idriche': '🚰',             'Deiezioni non raccolte': '🐕',
    'Segnaletica danneggiata': '🚧',     'Immobile pericolante': '🏚️',
    'Barriere architettoniche': '♿',    'Inquinamento acustico': '🔊',
    'Veicoli abbandonati': '🛺',         'Degrado e sicurezza': '💊',
    'Altro': '📦'
  };
  const catEmoji = emojiMap[cat] || '📌';
  const urgLabel = urgenza === 'Alta' ? '🔴 URGENTE — ' : urgenza === 'Bassa' ? '🟢 ' : '🟡 ';

  const siteUrl = CONFIG.comune.siteUrl
    || window.location.href.replace('segnalazione-civica.html', 'index.html').split('?')[0];

  const siteBase = siteUrl.endsWith('index.html')
    ? siteUrl.slice(0, -'index.html'.length)
    : siteUrl.replace(/\/?$/, '/');
  const predictedImgUrl = reportData.hasPhoto ? siteBase + 'img/' + ticketId + '.jpg' : null;

  const resolveUrl = window.location.href.split('segnalazione-civica.html')[0] + 'index.html?risolvi=' + token;

  const testoMessaggio = [
    `📍 Segnalazione Civica — ${urgLabel}${cat}`,
    `📌 Luogo: ${addr}`,
    descr ? `📝 Note: ${descr}` : '',
    areaData ? `🏛️ Destinatario: ${areaData.nome}` : '',
    `👤 Segnalato da: ${nome}`,
    `🕐 ${now.toLocaleString('it-IT')}`,
    `#SegnalaOra #${cat.replace(/[^a-zA-Z]/g,'')}`,
    ticketId,
    `\n──────────────────────────────────────`,
    `Per segnare questa segnalazione come RISOLTA:`,
    resolveUrl,
    `──────────────────────────────────────`
  ].filter(Boolean).join('\n');

  // 1. POST JSON ad Apps Script
  if (CONFIG.appsScriptUrl) {
    const payload = {
      ID_Segnalazione:    ticketId,
      Timestamp_UTC:      now.toISOString(),
      Data:               now.toLocaleDateString('it-IT'),
      Ora:                now.toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'}),
      Categoria:          cat,
      Categoria_Emoji:    catEmoji,
      Urgenza:            urgenza,
      Descrizione:        descr,
      Nome_Segnalante:    nome,
      Email_Segnalante:   emailSegnalante,
      Lat:                reportData.lat.toFixed(6),
      Long:               reportData.lng.toFixed(6),
      Indirizzo_Completo: addr,
      Via:                reportData.via,
      Numero_Civico:      reportData.civico,
      CAP:                reportData.cap,
      Comune:             reportData.comune,
      Provincia:          reportData.provincia,
      Regione:            reportData.regione,
      Fonte_Posizione:    reportData.fontePosizione,
      Accuratezza_GPS_m:  String(reportData.accuratezza),
      Area_Destinataria:  areaData ? areaData.nome : '',
      CC_Destinatari:     getCCEmails().join(';'),
      Destinatari:        [areaData ? areaData.nome : '', ...getCCEmails(), socialKey].filter(Boolean).join(';'),
      Canale_Email:       areaData ? 'Sì' : 'No',
      Canale_WhatsApp:    'No',
      Canale_Twitter:     socialKey === 'twitter'  ? 'Sì' : 'No',
      Canale_Facebook:    socialKey === 'facebook' ? 'Sì' : 'No',
      Ha_Immagine:        reportData.hasPhoto ? 'Sì' : 'No',
      Dimensioni_Immagine: reportData.photoDims,
      Testo_Messaggio:    testoMessaggio,
      URL_Segnalazione:   siteUrl,
      Stato:              'Nuova',
      Token_Risoluzione:  token,
      ...(predictedImgUrl ? { URL_Immagine: predictedImgUrl } : {}),
      ...(reportData.photoResized ? { imageBase64: reportData.photoResized } : {}),
    };
    try {
      await fetch(CONFIG.appsScriptUrl, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch(e) {}
  }

  // 2. Apri canali selezionati
  const channelsBadges = [];
  const testoBreve = encodeURIComponent(testoMessaggio.substring(0, 280));
  const urlEnc     = encodeURIComponent(siteUrl);
  const delay = ms => new Promise(r => setTimeout(r, ms));

  // Email (destinatario principale + CC)
  const ccEmails = getCCEmails().filter(e => e !== (areaData ? areaData.email : ''));
  const toEmail  = areaData ? areaData.email : (ccEmails.shift() || '');

  if (toEmail) {
    const subject  = encodeURIComponent(`[SegnalaOra] ${cat} — ${ticketId}`);
    const body     = encodeURIComponent(testoMessaggio + '\n\nInviato tramite SegnalaOra');
    const ccParam  = ccEmails.length ? '&cc=' + encodeURIComponent(ccEmails.join(',')) : '';
    window.location.href = `mailto:${toEmail}?subject=${subject}${ccParam}&body=${body}`;
    const nomeBreve = areaData
      ? (areaData.nome.length > 40 ? areaData.nome.substring(0, 40) + '…' : areaData.nome)
      : toEmail;
    channelsBadges.push('🏛️ ' + nomeBreve);
    if (ccEmails.length) channelsBadges.push(`+${ccEmails.length} CC`);
    await delay(800);
  }

  // Social selezionato
  if (socialKey && socialOpt) {
    const handle   = socialOpt.dataset.handle;
    const pageUrl  = socialOpt.dataset.url;
    const nomePiattaforma = socialOpt.dataset.piattaforma;
    if (socialKey === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${urlEnc}&quote=${testoBreve}`, '_blank');
    } else if (socialKey === 'twitter') {
      const tweetText = encodeURIComponent(
        `${urgLabel}${cat}\n📌 ${reportData.via || reportData.comune}\n@${handle}\n#SegnalaOra\n${ticketId}`
      );
      window.open(`https://twitter.com/intent/tweet?text=${tweetText}&url=${urlEnc}`, '_blank');
    } else {
      window.open(pageUrl, '_blank');
    }
    channelsBadges.push(platformEmoji(socialKey) + ' ' + nomePiattaforma);
  }

  // 3. Schermata di successo
  document.getElementById('ticketId').textContent = ticketId;
  document.getElementById('successDetail').textContent =
    'Segnalazione registrata nell\'archivio. I canali selezionati sono stati aperti.';

  const badgesEl = document.getElementById('channelsSent');
  badgesEl.innerHTML = channelsBadges.map(b => `<span class="channel-badge">${b}</span>`).join('');

  document.querySelectorAll('.section-card').forEach(c => c.classList.remove('visible'));
  document.getElementById('cardSuccess').classList.add('visible');
  document.querySelectorAll('.step').forEach(s => { s.classList.remove('active'); s.classList.add('done'); });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetAll() { location.reload(); }

function closeSuccess() {
  const id = document.getElementById('ticketId').textContent;
  alert(`⚠️ Prima di chiudere copia il tuo ID segnalazione:\n\n${id}\n\nConservalo per seguire l'evoluzione della tua segnalazione.`);
  location.reload();
}

function copyTicketId() {
  const id = document.getElementById('ticketId').textContent;
  navigator.clipboard.writeText(id).then(() => {
    const btn = document.getElementById('copyIdBtn');
    btn.textContent = '✓ Copiato';
    setTimeout(() => { btn.textContent = '📋 Copia'; }, 1800);
  });
}

// ─────────────────────────────────────────────
//  HELP CONFIG
// ─────────────────────────────────────────────
function showConfigHelp() {
  alert(
    'Come configurare SegnalaOra:\n\n' +
    '1. Vai su script.google.com → Nuovo progetto\n' +
    '2. Incolla il contenuto del file dati/apps-script.gs\n' +
    '3. Clicca "Distribuisci" → "Nuova distribuzione"\n' +
    '4. Tipo: App web | Esegui come: Me | Accesso: Chiunque\n' +
    '5. Autorizza l\'app con il tuo account Google\n' +
    '6. Copia l\'URL della distribuzione (finisce con /exec)\n' +
    '7. Incollalo nel campo appsScriptUrl del CONFIG in questo file\n' +
    '8. Aggiorna i dati del comune (email, WhatsApp, Twitter, Facebook)\n\n' +
    'Il foglio Google Sheets viene popolato automaticamente ad ogni segnalazione.'
  );
}

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
initFromJSON();
document.getElementById('s1').classList.add('active');

function openInfo()  { document.getElementById('infoOverlay').classList.add('open'); }
function closeInfo() { document.getElementById('infoOverlay').classList.remove('open'); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeInfo(); });
