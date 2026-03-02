// ═══════════════════════════════════════════════════════════════
//  SegnalaOra — Google Apps Script
//  Incolla questo codice su https://script.google.com
//  poi: Distribuisci → Nuova distribuzione → App web
//       Esegui come: Me  |  Chi ha accesso: Chiunque
// ═══════════════════════════════════════════════════════════════

// ID del tuo Google Sheet (dalla URL: /spreadsheets/d/ID/edit)
const SHEET_ID = '1Wy86M342so7EHLi3F-G5UNvXFq058Zr5EKAPhjNS3FM';

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

    const mittente = `SegnalaOra — Comune di ${NOME_COMUNE}`;

    // Email all'ufficio PA (solo se è stato fornito l'indirizzo del destinatario)
    // noReply:true → Google usa un relay anonimo: il vero account Gmail non è visibile
    // replyTo → quando la PA risponde, la risposta arriva direttamente al cittadino
    if (data.Email_Destinatario && data.Testo_Messaggio) {
      try {
        const subjectPA = `[SegnalaOra] ${data.Categoria_Emoji || ''}${data.Categoria} — ${data.ID_Segnalazione}`;
        MailApp.sendEmail({
          to:       data.Email_Destinatario,
          subject:  subjectPA,
          body:     data.Testo_Messaggio,
          name:     mittente,
          noReply:  true,
          replyTo:  data.Email_Segnalante || '',
        });
      } catch(mailErr) {
        // Non bloccare l'invio se l'email alla PA fallisce
      }
    }

    // Email di conferma al segnalante (solo se ha fornito l'email)
    // noReply:true → il segnalante non vede l'account Google proprietario dello script
    if (data.Email_Segnalante) {
      try {
        const subject = `[SegnalaOra] Segnalazione ricevuta — ${data.ID_Segnalazione}`;
        const body = [
          `Ciao ${data.Nome_Segnalante || 'Cittadino'},`,
          ``,
          `La tua segnalazione è stata registrata con successo nel sistema SegnalaOra.`,
          ``,
          `📋 ID segnalazione: ${data.ID_Segnalazione}`,
          `📍 Categoria: ${data.Categoria_Emoji} ${data.Categoria}`,
          `📌 Luogo: ${data.Indirizzo_Completo}`,
          `🕐 Data/ora: ${data.Data} ${data.Ora}`,
          ``,
          `Conserva questo ID per seguire l'evoluzione della segnalazione.`,
          ``,
          `— ${mittente}`,
        ].join('\n');
        MailApp.sendEmail({
          to:      data.Email_Segnalante,
          subject: subject,
          body:    body,
          name:    mittente,
          noReply: true,
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
//  doGet — risponde a GET (serve per testare che lo script funzioni)
// ───────────────────────────────────────────────────────────────
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'SegnalaOra', status: 'attivo' }))
    .setMimeType(ContentService.MimeType.JSON);
}
