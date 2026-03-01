// ═══════════════════════════════════════════════════════════════
//  SegnalaOra — Google Apps Script
//  Incolla questo codice su https://script.google.com
//  poi: Distribuisci → Nuova distribuzione → App web
//       Esegui come: Me  |  Chi ha accesso: Chiunque
// ═══════════════════════════════════════════════════════════════

// ID del tuo Google Sheet (dalla URL: /spreadsheets/d/ID/edit)
const SHEET_ID = '1Wy86M342so7EHLi3F-G5UNvXFq058Zr5EKAPhjNS3FM';

// Nome del foglio (tab in basso nel foglio — di solito "Foglio1")
const SHEET_NAME = 'Foglio1';

// Ordine colonne — deve corrispondere ESATTAMENTE all'intestazione del foglio
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
  'Stato',
  'Note_Ufficio',
  'Operatore',
  'Data_Presa_Carico',
  'Data_Risoluzione',
];

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
      return risolviSegnalazione(sheet, data.ID_Segnalazione);
    }

    // Azione default: inserisci nuova segnalazione
    // Se il foglio è vuoto, scrivi l'intestazione
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(COLUMNS);
      // Formatta intestazione: grassetto + sfondo scuro
      const header = sheet.getRange(1, 1, 1, COLUMNS.length);
      header.setFontWeight('bold');
      header.setBackground('#1a1208');
      header.setFontColor('#f5f0e8');
    }

    // Costruisci la riga nello stesso ordine di COLUMNS
    const row = COLUMNS.map(col => data[col] !== undefined ? data[col] : '');
    sheet.appendRow(row);

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
//  risolviSegnalazione — trova la riga per ID e aggiorna Stato
// ───────────────────────────────────────────────────────────────
function risolviSegnalazione(sheet, id) {
  if (!id) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'ID_Segnalazione mancante' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Nessuna segnalazione nel foglio' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const idColIdx      = COLUMNS.indexOf('ID_Segnalazione') + 1;   // colonna 1
  const statoColIdx   = COLUMNS.indexOf('Stato') + 1;             // colonna 31
  const dataRisColIdx = COLUMNS.indexOf('Data_Risoluzione') + 1;  // colonna 35

  // Leggi tutti gli ID dalla riga 2 in poi
  const ids = sheet.getRange(2, idColIdx, lastRow - 1, 1).getValues();
  let foundRow = -1;
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === id) {
      foundRow = i + 2; // +2: header (riga 1) + indice 0-based
      break;
    }
  }

  if (foundRow === -1) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'ID non trovato: ' + id }))
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
    .createTextOutput(JSON.stringify({ ok: true, id: id, data: oggi }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ───────────────────────────────────────────────────────────────
//  doGet — risponde a GET (serve per testare che lo script funzioni)
// ───────────────────────────────────────────────────────────────
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'SegnalaOra', status: 'attivo' }))
    .setMimeType(ContentService.MimeType.JSON);
}
