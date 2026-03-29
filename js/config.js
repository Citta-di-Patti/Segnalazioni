/* ═══════════════════════════════════════════════════════════════════
   SegnalaOra — FILE DI CONFIGURAZIONE
   Modifica questo file per personalizzare l'app per il tuo comune.
   Tutti gli altri file JS leggono da APP_CONFIG — non toccarli.
   ═══════════════════════════════════════════════════════════════════ */

const APP_CONFIG = {

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. GOOGLE SERVICES
  //    Ottieni questi valori dal tuo Google Workspace.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  appsScriptUrl:    'https://script.google.com/macros/s/AKfycbw5jxYNx22rStYkic_VfScp8BWDkDCDBCZ4HXxZWENKlRxTkeRzNxPHtWjIOrl8-x2Yfg/exec',
                    // Usato da: segnalazione-civica.js (POST nuova seg.) + map.js (risolvi)
  sheetsCsvAperte:  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRgoBvOwsaEEuh5odDgDpCXr3kNwcp8LUSWpK-liD2BFPqx8Lzc8t7Khm21aGpfvEJMVz4ppAzwyyNN/pub?gid=1499347265&single=true&output=csv',
  sheetsCsvRisolte: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRgoBvOwsaEEuh5odDgDpCXr3kNwcp8LUSWpK-liD2BFPqx8Lzc8t7Khm21aGpfvEJMVz4ppAzwyyNN/pub?gid=1700126523&single=true&output=csv',

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. IDENTITA' APP
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  app: {
    nome:          'SegnalaOra',
    sottotitolo:   'Invia una nuova segnalazione',
    descrizione:   'Segnala in modo semplice e georeferenziato i problemi del tuo territorio.',
    siteUrl:       'https://citta-di-patti.github.io/Segnalazioni/',         // URL del sito (es: https://segnalaora.comune.it) — lascia vuoto per auto-rilevamento
    ogImage:       '',         // URL immagine Open Graph (1200x630 px)
    hashtag:       '#SegnalaOra #Patti',
    bannerCrediti: 'Web app civica<br/>by <a href="https://opendatasicilia.it" target="_blank" rel="noopener">@opendatasicilia</a>',
    // Nota: bannerCrediti viene passato come `expandcontent` a L.controlCredits() in map.js
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. PUBBLICA AMMINISTRAZIONE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  pa: {
    nome:          'Città di Patti',
    sito:          'https://www.comune.patti.me.it',
    emailDefault:  'ced@comune.patti.me.it',
    twitterHandle: '',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. MAPPA
  //    lat/lng: coordinate del centro del tuo comune.
  //    Usa Google Maps o OpenStreetMap per trovare le coordinate.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  mappa: {
    lat:          38.1397,  // latitudine centro comune
    lng:          14.9692,  // longitudine centro comune
    zoomForm:     14,       // zoom nel form segnalazione (segnalazione-civica.js)
    zoomPubblica: 13,       // zoom mappa pubblica (mappa.html)
    maxZoomForm:  20,       // zoom massimo nel form segnalazione
    maxZoom:      19,       // zoom massimo mappa pubblica
    fitBoundsPad: 0.15,     // padding attorno ai marker (0 = nessun margine, 0.5 = ampio)
    pageSize:     10,       // numero di segnalazioni per pagina nella lista laterale
    loadTimeout:  12000,    // timeout fetch CSV in ms
    popupDelay:   350,      // ritardo apertura popup su click lista in ms
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. CATEGORIE E DESTINATARI
  //    Ogni voce corrisponde a un bottone nel form e a una categoria
  //    nei grafici/statistiche.
  //    Sostituisce dati/destinatari.json E ALL_CATEGORIES in statistiche.js.
  //
  //    Campi:
  //      id          — identificatore univoco (no spazi)
  //      nome        — etichetta breve del bottone
  //      descrizione — sottotitolo del bottone
  //      categoria   — valore salvato nel CSV e usato nei grafici
  //      email       — email dell'ufficio competente (null = nessuna email)
  //      icon        — classe FontAwesome (es: 'fa-solid fa-road')
  //      custom      — se true, l'utente puo inserire un'email libera
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  destinatari: [
    {
      id:          'strade',
      nome:        'Buche stradali',
      descrizione: 'Buche, asfalto, marciapiedi',
      categoria:   'Buche e dissesti stradali',
      email:       'ced@comune.patti.me.it',
      icon:        'fa-solid fa-road-circle-exclamation',
      custom:      false,
    },
    {
      id:          'luce',
      nome:        'Illuminazione',
      descrizione: 'Lampioni guasti, semafori',
      categoria:   'Illuminazione pubblica guasta',
      email:       'ced@comune.patti.me.it',
      icon:        'fa-solid fa-lightbulb',
      custom:      false,
    },
    {
      id:          'rifiuti',
      nome:        'Rifiuti',
      descrizione: 'Rifiuti abbandonati, degrado',
      categoria:   'Rifiuti abbandonati',
      email:       'ced@comune.patti.me.it',
      icon:        'fa-solid fa-trash-can',
      custom:      false,
    },
    {
      id:          'verde',
      nome:        'Verde Pubblico',
      descrizione: 'Alberi, parchi, aree verdi',
      categoria:   'Alberi e verde pubblico',
      email:       'ced@comune.patti.me.it',
      icon:        'fa-solid fa-tree',
      custom:      false,
    },
    {
      id:          'acqua',
      nome:        'Perdite idriche',
      descrizione: 'Perdite, allagamenti, fognature',
      categoria:   'Perdite idriche',
      email:       'ced@comune.patti.me.it',
      icon:        'fa-solid fa-faucet-drip',
      custom:      false,
    },
    {
      id:          'deiezioni',
      nome:        'Deiezioni',
      descrizione: 'Deiezioni animali non raccolte',
      categoria:   'Deiezioni non raccolte',
      email:       'ced@comune.patti.me.it',
      icon:        'fa-solid fa-paw',
      custom:      false,
    },
    {
      id:          'segnaletica',
      nome:        'Segnaletica',
      descrizione: 'Cartelli danneggiati, strisce',
      categoria:   'Segnaletica danneggiata',
      email:       'ced@comune.patti.me.it',
      icon:        'fa-solid fa-signs-post',
      custom:      false,
    },
    {
      id:          'veicoli',
      nome:        'Veicoli abbandonati',
      descrizione: 'Auto, moto abbandonate',
      categoria:   'Veicoli abbandonati',
      email:       'ced@comune.patti.me.it',
      icon:        'fa-solid fa-car-side',
      custom:      false,
    },
    {
      id:          'sicurezza',
      nome:        'Sicurezza',
      descrizione: 'Degrado, ordine pubblico',
      categoria:   'Degrado e sicurezza',
      email:       'ced@comune.patti.me.it',
      icon:        'fa-solid fa-shield-halved',
      custom:      false,
    },
    {
      id:          'barriere',
      nome:        'Barriere arch.',
      descrizione: 'Accessibilita disabili',
      categoria:   'Barriere architettoniche',
      email:       'ced@comune.patti.me.it',
      icon:        'fa-solid fa-wheelchair',
      custom:      false,
    },
    {
      id:          'immobile',
      nome:        'Immobile',
      descrizione: 'Edifici pericolanti, crolli',
      categoria:   'Immobile pericolante',
      email:       'ced@comune.patti.me.it',
      icon:        'fa-solid fa-house-crack',
      custom:      false,
    },
    {
      id:          'rumore',
      nome:        'Rumore',
      descrizione: 'Inquinamento acustico',
      categoria:   'Inquinamento acustico',
      email:       'ced@comune.patti.me.it',
      icon:        'fa-solid fa-volume-high',
      custom:      false,
    },
    {
      id:          'altro',
      nome:        'Altro',
      descrizione: 'Inserisci l\'email destinatario',
      categoria:   'Altro',
      email:       null,
      icon:        'fa-solid fa-ellipsis',
      custom:      true,
    },
  ],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6. IMPOSTAZIONI FORM
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  form: {
    maxFoto:           4,     // numero massimo di foto allegabili
    categorieVisibili: 6,     // categorie visibili prima del pulsante "mostra altri"
    maxRisoluzioneImg: 1280,  // larghezza/altezza max foto in px (lato lungo)
    qualitaJpeg:       0.85,  // qualita compressione JPEG (0.0–1.0)
    maxStoriaProfilo:  50,    // max segnalazioni salvate in localStorage
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 7. SOCIAL SHARING
  //    Rimuovi da 'piattaforme' quelle che non vuoi mostrare.
  //    Ordine dell'array = ordine dei bottoni nel form.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  social: {
    piattaforme:   ['twitter', 'whatsapp', 'facebook', 'telegram', 'bluesky'],
    maxTestoChars: 120,  // lunghezza max descrizione nel testo del post social
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 8. COLORI MARKER
  //    Colori dei pin sulla mappa pubblica per urgenza e stato.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  marker: {
    Alta:    '#e53535',  // rosso — urgenza alta
    Normale: '#ff9900',  // arancione — urgenza normale
    Bassa:   '#3cb4d8',  // azzurro — urgenza bassa
    Risolta: '#3d5a47',  // verde scuro — segnalazione risolta
    default: '#d4820a',  // ambra — fallback
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 9. COLORI GRAFICI
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  grafici: {
    // Palette per il grafico a barre delle categorie (una per barra)
    paletteCategorie: [
      '#d4820a', '#e09a2a', '#c07020', '#f0b040', '#b06010',
      '#3cb4d8', '#2a9ec0', '#4dcae0', '#1a8aaa', '#5ad0e8',
      '#3d5a47', '#2d4435',
    ],
    // Grafico doughnut — urgenza
    urgenza: {
      Alta:    '#e53535',
      Normale: '#ff9900',
      Bassa:   '#3cb4d8',
    },
    // Grafico doughnut — stato
    stato: {
      Nuova:              '#d4820a',
      'In lavorazione':   '#3cb4d8',
      Risolta:            '#3d5a47',
      Chiusa:             '#a8a090',
    },
    // Grafico a barre — andamento nel tempo
    trend: {
      sfondo: 'rgba(212,130,10,0.75)',
      bordo:  '#d4820a',
    },
  },
};
