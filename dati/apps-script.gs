// ═══════════════════════════════════════════════════════════════
//  SegnalaOra — Google Apps Script
//  Incolla questo codice su https://script.google.com
//  poi: Distribuisci → Nuova distribuzione → App web
//       Esegui come: Me  |  Chi ha accesso: Chiunque
// ═══════════════════════════════════════════════════════════════

// ID del tuo Google Sheet (dalla URL: /spreadsheets/d/ID/edit)
const SHEET_ID = '1Wun8u5LG04R_4GuT8XOG5l_QT3NulmULCztNUI4n-E0';

// Nome del foglio (tab in basso nel foglio)
const SHEET_NAME = 'Main';

// ─── Configurazione email ─────────────────────────────────────
// Nome del comune che appare nel campo "Da:" delle email inviate
const NOME_COMUNE = 'XXXX';           // ← personalizza: es. 'Palermo'

// Indirizzo replyTo per le email al segnalante (opzionale).
// Se impostato, appare come "Rispondi a:" nella mail di conferma al cittadino.
// Non serve configurare alias Gmail: con noReply:true il mittente reale è sempre nascosto.
const EMAIL_NOREPLY = '';             // ← es. 'noreply@comune.it'

// ─── Configurazione GitHub per upload immagini ───────────────
//  SETUP (una tantum):
//  1. Genera un fine-grained PAT su github.com → Settings → Developer settings →
//     Personal access tokens → Fine-grained tokens → Repository: Segnalazioni
//     Permissions: Contents → Read and write
//  2. In Apps Script → Impostazioni progetto → Proprietà script → aggiungi:
//     GITHUB_TOKEN = <il tuo token>
//     (il token NON va mai scritto nel codice sorgente)
const GITHUB_OWNER  = 'gbvitrano';
const GITHUB_REPO   = 'Segnalazioni';
const GITHUB_BRANCH = 'master';

// Elenco di tutte le colonne previste — usato solo da ensureHeaders()
// per verificare che non manchino intestazioni nel foglio.
// L'ordine NON è più critico: la scrittura usa le intestazioni reali del foglio.
const COLUMNS = [
  'ID_Segnalazione',
  'Timestamp_UTC',
  'Data',
  'Ora',
  'Categoria',
  'Categoria_Emoji',
  'Urgenza',
  'Descrizione',
  'Nome_Segnalante',
  'Email_Segnalante',
  'Lat',
  'Long',
  'Indirizzo_Completo',
  'Via',
  'Numero_Civico',
  'CAP',
  'Comune',
  'Provincia',
  'Regione',
  'Fonte_Posizione',
  'Accuratezza_GPS_m',
  'Destinatari',
  'Canale_Email',
  'Canale_WhatsApp',
  'Canale_Twitter',
  'Canale_Facebook',
  'Ha_Immagine',
  'Dimensioni_Immagine',
  'Testo_Messaggio',
  'URL_Segnalazione',
  'URL_Immagine',        // URL immagine su Drive (compilato automaticamente se DRIVE_FOLDER_ID è impostato)
  'Stato',
  'Note_Ufficio',
  'Operatore',
  'Data_Presa_Carico',
  'Data_Risoluzione',
  'Token_Risoluzione',   // UUID segreto — NON pubblicare questa colonna nel CSV pubblico
];

// ───────────────────────────────────────────────────────────────
//  ensureHeaders — verifica che il foglio abbia tutte le colonne
//  di COLUMNS. Se il foglio è vuoto le crea; se ne mancano
//  alcune le aggiunge in fondo (senza toccare i dati esistenti).
// ───────────────────────────────────────────────────────────────
function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS);
    const h = sheet.getRange(1, 1, 1, COLUMNS.length);
    h.setFontWeight('bold');
    h.setBackground('#1a1208');
    h.setFontColor('#f5f0e8');
    return;
  }

  // Foglio già popolato: aggiungi solo le colonne assenti
  const existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const missing  = COLUMNS.filter(col => !existing.includes(col));
  if (missing.length === 0) return;

  const startCol = existing.length + 1;
  const newRange = sheet.getRange(1, startCol, 1, missing.length);
  newRange.setValues([missing]);
  newRange.setFontWeight('bold');
  newRange.setBackground('#1a1208');
  newRange.setFontColor('#f5f0e8');
}

// ───────────────────────────────────────────────────────────────
//  doPost — riceve i dati dall'app e li scrive nel foglio
//           oppure aggiorna lo stato di una segnalazione esistente
// ───────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const sheet = SpreadsheetApp
      .openById(SHEET_ID)
      .getSheetByName(SHEET_NAME);

    // Azione "risolvi": aggiorna Stato e Data_Risoluzione di una riga esistente
    if (data.action === 'risolvi') {
      return risolviSegnalazione(sheet, data);
    }

    // Azione default: inserisci nuova segnalazione

    // Carica immagine su GitHub (cartella img/ del repository)
    if (data.imageBase64) {
      try {
        const imgUrl = uploadImageToGitHub(data.ID_Segnalazione, data.imageBase64);
        if (imgUrl) data.URL_Immagine = imgUrl;
      } catch(imgErr) {
        // Non bloccare l'invio se il caricamento immagine fallisce
      }
    }

    ensureHeaders(sheet);

    // Costruisci la riga leggendo le intestazioni REALI del foglio
    // (immune all'ordine delle colonne e a colonne extra come URL_Immagine)
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = headers.map(col => data[col] !== undefined ? data[col] : '');
    sheet.appendRow(row);

    const mittente   = `SegnalaOra — Comune di ${NOME_COMUNE}`;
    const siteBase   = (data.URL_Segnalazione || '').replace(/\/?$/, '/');
    const resolveUrl = siteBase + 'mappa.html?risolvi=' + data.Token_Risoluzione;

    // Prepara allegato foto (base64 → Blob)
    let photoBlob = null;
    if (data.imageBase64) {
      try {
        const b64 = data.imageBase64.replace(/^data:image\/\w+;base64,/, '');
        photoBlob = Utilities.newBlob(
          Utilities.base64Decode(b64),
          'image/jpeg',
          data.ID_Segnalazione + '.jpg'
        );
      } catch(e) {}
    }

    // Email all'ufficio PA
    // noReply:true → Google usa un relay anonimo: il vero account Gmail non è visibile
    // replyTo     → quando la PA risponde, arriva direttamente al cittadino
    if (data.Email_Destinatario) {
      try {
        const urgPrefix  = data.Urgenza === 'Alta' ? '🔴 URGENTE — ' : '';
        const subjectPA  = '[SegnalaOra] ' + urgPrefix + data.Categoria + ' — ' + data.ID_Segnalazione;
        const optsPA = {
          to:       data.Email_Destinatario,
          subject:  subjectPA,
          htmlBody: buildEmailPA(data, mittente, resolveUrl),
          name:     mittente,
          noReply:  true,
          replyTo:  data.Email_Segnalante || '',
        };
        if (photoBlob) optsPA.attachments = [photoBlob];
        MailApp.sendEmail(optsPA);
      } catch(mailErr) {
        // Non bloccare l'invio se l'email alla PA fallisce
      }
    }

    // Email di conferma al segnalante
    // noReply:true → il segnalante non vede l'account Google proprietario dello script
    if (data.Email_Segnalante) {
      try {
        MailApp.sendEmail({
          to:       data.Email_Segnalante,
          subject:  '[SegnalaOra] Segnalazione ricevuta — ' + data.ID_Segnalazione,
          htmlBody: buildEmailSegnalante(data, mittente),
          name:     mittente,
          noReply:  true,
        });
      } catch(mailErr) {
        // Non bloccare l'invio se l'email al segnalante fallisce
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, id: data.ID_Segnalazione }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ───────────────────────────────────────────────────────────────
//  risolviSegnalazione — trova la riga per token (sicuro) o per ID
//  (fallback per vecchie email pre-token)
// ───────────────────────────────────────────────────────────────
function risolviSegnalazione(sheet, data) {
  const token = (data.token || '').trim();
  const id    = (data.ID_Segnalazione || '').trim();

  if (!token && !id) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Token o ID_Segnalazione mancante' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Nessuna segnalazione nel foglio' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Leggi le intestazioni REALI del foglio per trovare i numeri di colonna corretti
  const headers     = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const tokenColIdx   = headers.indexOf('Token_Risoluzione') + 1;
  const idColIdx      = headers.indexOf('ID_Segnalazione') + 1;
  const statoColIdx   = headers.indexOf('Stato') + 1;
  const dataRisColIdx = headers.indexOf('Data_Risoluzione') + 1;

  if (statoColIdx === 0 || dataRisColIdx === 0) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Colonne Stato/Data_Risoluzione non trovate nel foglio' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 1° tentativo: ricerca per Token_Risoluzione (più sicura)
  let foundRow = -1;
  if (token && tokenColIdx > 0) {
    const tokens = sheet.getRange(2, tokenColIdx, lastRow - 1, 1).getValues();
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i][0] === token) { foundRow = i + 2; break; }
    }
  }

  // 2° tentativo: fallback per ID (vecchie segnalazioni senza token)
  if (foundRow === -1 && id && idColIdx > 0) {
    const ids = sheet.getRange(2, idColIdx, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (ids[i][0] === id) { foundRow = i + 2; break; }
    }
  }

  if (foundRow === -1) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Segnalazione non trovata' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const oggi = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    'dd/MM/yyyy'
  );

  sheet.getRange(foundRow, statoColIdx).setValue('Risolta');
  sheet.getRange(foundRow, dataRisColIdx).setValue(oggi);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, data: oggi }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ───────────────────────────────────────────────────────────────
//  uploadImageToGitHub — scrive l'immagine nella cartella img/
//  del repository tramite GitHub API.
//  Restituisce l'URL GitHub Pages dell'immagine, o null se fallisce.
// ───────────────────────────────────────────────────────────────
function uploadImageToGitHub(id, imageBase64) {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) return null;   // token non configurato → skip silenzioso

  const b64    = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/img/${id}.jpg`;

  const response = UrlFetchApp.fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    payload: JSON.stringify({
      message: `img: aggiunge immagine ${id} [skip ci]`,
      content: b64,
      branch: GITHUB_BRANCH,
    }),
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() === 201) {
    return `https://${GITHUB_OWNER}.github.io/${GITHUB_REPO}/img/${id}.jpg`;
  }
  return null;
}

// ───────────────────────────────────────────────────────────────
//  buildEmailPA — corpo HTML per l'ufficio PA
// ───────────────────────────────────────────────────────────────
function buildEmailPA(data, mittente, resolveUrl) {
  const urgenza  = data.Urgenza || 'Normale';
  const urgColor = urgenza === 'Alta' ? '#c0392b' : urgenza === 'Bassa' ? '#3d5a47' : '#d4820a';
  const urgLabel = urgenza === 'Alta' ? '🔴 URGENTE' : urgenza === 'Bassa' ? '🟢 Bassa' : '🟡 Normale';

  const tdL = 'padding:9px 14px;background:#f9f6f0;color:#5a5044;font-size:0.82rem;white-space:nowrap;vertical-align:top;border-bottom:1px solid #ede8e0;width:130px;';
  const tdV = 'padding:9px 14px;font-size:0.88rem;border-bottom:1px solid #ede8e0;color:#1a1208;';

  const rows = [
    ['Categoria',    data.Categoria || '—'],
    ['Urgenza',      '<span style="color:' + urgColor + ';font-weight:bold;">' + urgLabel + '</span>'],
    ['Luogo',        data.Indirizzo_Completo || '—'],
    ['Coordinate',   (data.Lat && data.Long) ? data.Lat + ', ' + data.Long : '—'],
    ['Descrizione',  data.Descrizione || '—'],
    ['Destinatario', data.Area_Destinataria || '—'],
    ['Segnalato da', data.Nome_Segnalante || '—'],
    ['Email',        data.Email_Segnalante ? '<a href="mailto:' + data.Email_Segnalante + '" style="color:#d4820a;">' + data.Email_Segnalante + '</a>' : '—'],
    ['Data / ora',   (data.Data || '') + ' ' + (data.Ora || '')],
    ['ID',           '<strong>' + (data.ID_Segnalazione || '—') + '</strong>'],
  ].map(function(r) {
    return '<tr><td style="' + tdL + '">' + r[0] + '</td><td style="' + tdV + '">' + r[1] + '</td></tr>';
  }).join('');

  const photoHtml = data.URL_Immagine
    ? '<div style="margin:20px 0;"><a href="' + data.URL_Immagine + '"><img src="' + data.URL_Immagine + '" alt="Foto segnalazione" style="max-width:100%;border-radius:8px;border:1px solid #e8e0d4;"></a></div>'
    : '';

  return '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f0e8;font-family:\'Segoe UI\',Arial,sans-serif;">'
    + '<div style="max-width:620px;margin:24px auto;">'

    // Header
    + '<div style="background:#1a1208;padding:20px 28px;border-radius:10px 10px 0 0;">'
    + '<h2 style="margin:0;color:#f5f0e8;font-size:1.1rem;">📍 Nuova Segnalazione Civica</h2>'
    + '<p style="margin:5px 0 0;color:#d4820a;font-size:0.8rem;">' + mittente + '</p>'
    + '</div>'

    // Body
    + '<div style="background:#fff;border:1px solid #e8e0d4;border-top:none;padding:24px 28px;border-radius:0 0 10px 10px;">'
    + '<table style="width:100%;border-collapse:collapse;border:1px solid #ede8e0;border-radius:8px;overflow:hidden;">' + rows + '</table>'
    + photoHtml

    // Pulsante risolvi
    + '<div style="margin-top:24px;padding:18px 20px;background:#f5f0e8;border-radius:8px;border:1px solid #e8e0d4;">'
    + '<p style="margin:0 0 12px;font-size:0.83rem;color:#666;">Per segnare questa segnalazione come <strong>RISOLTA</strong>:</p>'
    + '<a href="' + resolveUrl + '" style="display:inline-block;padding:10px 22px;background:#3d5a47;color:#fff;text-decoration:none;border-radius:8px;font-size:0.88rem;font-weight:600;">✓ Segna come risolta</a>'
    + '</div>'

    + '<p style="margin:18px 0 0;font-size:0.73rem;color:#aaa;">Messaggio generato automaticamente da ' + mittente + '.<br>Rispondendo a questa email contatti direttamente il cittadino segnalante.</p>'
    + '</div></div></body></html>';
}

// ───────────────────────────────────────────────────────────────
//  buildEmailSegnalante — corpo HTML di conferma per il cittadino
// ───────────────────────────────────────────────────────────────
function buildEmailSegnalante(data, mittente) {
  const tdL = 'padding:8px 14px;background:#f9f6f0;color:#5a5044;font-size:0.82rem;white-space:nowrap;border-bottom:1px solid #ede8e0;width:110px;';
  const tdV = 'padding:8px 14px;font-size:0.88rem;border-bottom:1px solid #ede8e0;color:#1a1208;';

  const rows = [
    ['ID',        '<strong>' + (data.ID_Segnalazione || '—') + '</strong>'],
    ['Categoria', data.Categoria || '—'],
    ['Luogo',     data.Indirizzo_Completo || '—'],
    ['Data/ora',  (data.Data || '') + ' ' + (data.Ora || '')],
  ].map(function(r) {
    return '<tr><td style="' + tdL + '">' + r[0] + '</td><td style="' + tdV + '">' + r[1] + '</td></tr>';
  }).join('');

  return '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f0e8;font-family:\'Segoe UI\',Arial,sans-serif;">'
    + '<div style="max-width:560px;margin:24px auto;">'

    // Header
    + '<div style="background:#3d5a47;padding:20px 28px;border-radius:10px 10px 0 0;">'
    + '<h2 style="margin:0;color:#fff;font-size:1.1rem;">✓ Segnalazione ricevuta</h2>'
    + '<p style="margin:5px 0 0;color:#a8d5b5;font-size:0.8rem;">' + mittente + '</p>'
    + '</div>'

    // Body
    + '<div style="background:#fff;border:1px solid #e8e0d4;border-top:none;padding:24px 28px;border-radius:0 0 10px 10px;">'
    + '<p style="margin:0 0 16px;font-size:0.95rem;">Ciao <strong>' + (data.Nome_Segnalante || 'Cittadino') + '</strong>,</p>'
    + '<p style="margin:0 0 16px;color:#555;font-size:0.88rem;">La tua segnalazione è stata registrata con successo nel sistema SegnalaOra.</p>'
    + '<table style="width:100%;border-collapse:collapse;border:1px solid #ede8e0;border-radius:8px;overflow:hidden;margin-bottom:20px;">' + rows + '</table>'
    + '<p style="margin:0;font-size:0.83rem;color:#555;">Conserva il tuo <strong>ID segnalazione</strong> per seguire l\'evoluzione della pratica.</p>'
    + '<p style="margin:20px 0 0;font-size:0.73rem;color:#aaa;">— ' + mittente + '</p>'
    + '</div></div></body></html>';
}

// ───────────────────────────────────────────────────────────────
//  doGet — risponde a GET (serve per testare che lo script funzioni)
// ───────────────────────────────────────────────────────────────
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'SegnalaOra', status: 'attivo' }))
    .setMimeType(ContentService.MimeType.JSON);
}
