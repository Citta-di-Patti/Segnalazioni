# Piano UX — SegnalaOra: miglioramenti user-friendly

> Basato sull'analisi completa del marzo 2026.
> Obiettivo: rendere l'app fruibile anche da utenti inesperti, senza stravolgere l'architettura zero-backend.

---

## Priorità 1 — Bloccanti (implementare subito)

Questi problemi impediscono o compromettono l'uso corretto dell'app.

---

### 1.1 — Feedback invio segnalazione

**Problema**
Il POST ad Apps Script usa `mode: 'no-cors'`. La risposta è sempre opaca: anche se fallisce, il codice non può rilevarlo. L'utente vede la schermata di successo senza certezza che la segnalazione sia arrivata.

**Soluzione**
- Aggiungere un banner giallo di avviso nella success screen:
  > ⚠️ **Nota:** il messaggio email si apre nel tuo client di posta. Verifica di averlo inviato prima di chiudere.
- Mostrare un checklist visiva dei canali effettivamente aperti (email, social) con stato "aperto" / "da aprire".
- Eliminare la dipendenza da `alert()` nella funzione `closeSuccess()` — sostituire con un banner inline `<div class="warn-banner">` già visibile nella card di successo.

**File:** `segnalazione-civica.html`, `js/segnalazione-civica.js`, `css/segnalazione-civica.css`
**Stima:** piccola — 1–2 ore

---

### 1.2 — Validazione email in tempo reale

**Problema**
L'errore email compare solo al `blur` oppure al tentativo di submit. L'utente può arrivare al passo 4 con email mal formata senza saperlo.

**Soluzione**
- Aggiungere listener `input` sull'email: dopo 600ms di inattività (debounce), se il campo ha contenuto, validare e mostrare errore/ok.
- Aggiungere icona ✓ / ✗ inline a destra del campo per feedback visivo immediato.
- Il `<span class="field-error">` esiste già — usarlo anche sul `input` event.

**File:** `js/segnalazione-civica.js` (`validateEmailField`)
**Stima:** minima — 30 min

---

### 1.3 — Area destinataria obbligatoria

**Problema**
Il dropdown "Destinatario (A:)" non è obbligatorio. L'utente può inviare senza selezionare nessun ufficio — il messaggio email non viene aperto e la segnalazione non arriva a nessuno.

**Soluzione**
- In `sendReport()`: se `areaData === null` e `getCCEmails().length === 0`, bloccare l'invio con un messaggio chiaro:
  > ⚠️ Seleziona almeno un destinatario prima di inviare.
- Evidenziare il dropdown con bordo rosso e scrollare automaticamente alla sezione.
- Aggiungere testo helper sotto il dropdown:
  > *Seleziona l'ufficio o la società a cui inviare la segnalazione*

**File:** `js/segnalazione-civica.js`, `segnalazione-civica.html`
**Stima:** piccola — 1 ora

---

### 1.4 — Timeout caricamento CSV nella mappa

**Problema**
Se il CSV di Google Sheets non risponde, la mappa resta bloccata su "Caricamento segnalazioni..." senza mai mostrare un errore. L'utente non sa se aspettare o se qualcosa è andato storto.

**Soluzione**
- Aggiungere un `AbortController` con timeout di 12 secondi al fetch del CSV.
- In caso di timeout o errore, mostrare nel pannello laterale:
  > ❌ Impossibile caricare le segnalazioni. Controlla la connessione o riprova tra qualche minuto.
  > [🔄 Riprova]
- Il pulsante "Riprova" richiama `loadReports()`.

**File:** `js/map.js`
**Stima:** piccola — 1 ora

---

### 1.5 — Token risoluzione visibile nella success screen

**Problema**
Il `token` di risoluzione è generato nel client, incluso nell'email inviata alla PA e nell'URL `resolveUrl`, ma non viene mai mostrato all'utente. Se l'email non arriva o viene persa, il token è irrecuperabile.

**Soluzione**
- Mostrare il token nella success screen in un campo copiabile (stesso pattern del Ticket ID):
  ```
  🔑 Token risoluzione: 550e8400-e29b-41d4-a716-446655440000
  [📋 Copia]
  ```
- Aggiungere testo esplicativo:
  > *Conserva questo codice: serve alla PA per marcare la segnalazione come risolta.*

**File:** `segnalazione-civica.html`, `js/segnalazione-civica.js`
**Stima:** minima — 30 min

---

## Priorità 2 — Confondono gli utenti

Problemi che non bloccano l'uso ma causano incomprensioni frequenti.

---

### 2.1 — Avviso coordinate EXIF da foto vecchia

**Problema**
Se l'utente carica una foto scattata altrove (es. una foto di archivio), le coordinate EXIF potrebbero posizionare la segnalazione in un luogo sbagliato. L'app usa EXIF con priorità massima senza avvertire.

**Soluzione**
- Dopo l'estrazione EXIF, mostrare un banner giallo nel passo 2:
  > 📸 Posizione estratta dalla foto (coordinate EXIF). Verifica che il marker sulla mappa corrisponda al luogo del problema. Se non è corretto, trascina il marker nella posizione giusta.
- Aggiungere un pulsante "Usa GPS del dispositivo invece" per sovrascrivere.

**File:** `js/segnalazione-civica.js` (`useExifGps`), `segnalazione-civica.html`
**Stima:** piccola — 1 ora

---

### 2.2 — Eliminare `alert()` dalla success screen

**Problema**
`closeSuccess()` usa `alert()` nativo del browser per mostrare l'ID ticket. Blocca l'interazione, non è stilizzabile, ed è inaspettato.

**Soluzione**
- Rimuovere l'`alert()` da `closeSuccess()`.
- Rendere il Ticket ID sempre visibile nella success card con un pulsante "📋 Copia" già prominente.
- Se l'utente clicca "Chiudi" senza aver copiato, mostrare un banner inline sopra il pulsante:
  > 💡 Hai copiato il tuo ID segnalazione? Ne avrai bisogno per seguire l'evoluzione.

**File:** `js/segnalazione-civica.js`, `segnalazione-civica.html`
**Stima:** minima — 30 min

---

### 2.3 — Helper text campo email CC

**Problema**
Il campo testo libero CC accetta email separate da virgola, ma l'utente non lo sa. Molti potrebbero usare `;` (punto e virgola) o spazio.

**Soluzione**
- Aggiungere sotto il campo:
  > *Separa più email con una virgola: `email1@comune.it, email2@pec.it`*
- Accettare anche `;` e spazio come separatori alternativi (split con regex `/[,;\s]+/`).

**File:** `js/segnalazione-civica.js` (`getCCEmails`), `segnalazione-civica.html`
**Stima:** minima — 20 min

---

### 2.4 — Stat cards: indicatore "dati filtrati"

**Problema**
Quando l'utente filtra per categoria nelle statistiche, le stat cards cambiano numero ma non è chiaro che mostrano un sottoinsieme. Potrebbe pensare che i totali globali siano quei numeri.

**Soluzione**
- Quando un filtro è attivo, aggiungere un badge sotto ogni numero:
  > *filtrato per: Buche e dissesti stradali*
- Colorare le card con un bordo amber per indicare lo stato filtrato.
- Mostrare il totale globale tra parentesi grigi: `3 (di 47)`

**File:** `js/statistiche.js` (`updateStatCards`), `css/statistiche.css`
**Stima:** piccola — 1 ora

---

### 2.5 — Testo helper sulla mappa "Come risolvere"

**Problema**
Il campo UUID per marcare una segnalazione come risolta mostra solo un placeholder con formato UUID. L'utente non capisce dove trovarlo.

**Soluzione**
- Aggiungere sotto il campo:
  > *Trovi il codice nell'email ricevuta dalla PA al momento della segnalazione.*
- Aggiungere un'icona info `ⓘ` con tooltip al hover.

**File:** `index.html`
**Stima:** minima — 15 min

---

## Priorità 3 — Qualità UX

Miglioramenti che rendono l'esperienza più fluida e professionale.

---

### 3.1 — Tooltip sulle categorie

**Problema**
Le categorie ("Barriere architettoniche", "Degrado e sicurezza") non sono sempre intuitive per utenti anziani o poco pratici.

**Soluzione**
- Aggiungere un `title` attribute al `<option>` con una breve descrizione:
  > Barriere architettoniche — Ostacoli per disabili: rampe mancanti, ascensori guasti, marciapiedi non accessibili
- Alternativamente: al cambio categoria mostrare un piccolo help text sotto il select.

**File:** `segnalazione-civica.html`, `js/segnalazione-civica.js`
**Stima:** piccola — 1 ora

---

### 3.2 — Spinner visivo durante l'invio

**Problema**
Durante `sendReport()` il testo del bottone diventa "⏳ Invio in corso..." ma non c'è un feedback visivo nel resto della pagina. Su connessione lenta l'utente potrebbe cliccare di nuovo.

**Soluzione**
- Aggiungere una overlay semi-trasparente sulla card step 4 durante l'invio.
- Mostrare uno spinner CSS centrato.
- Rimuovere overlay al completamento (successo o errore).

**File:** `css/segnalazione-civica.css`, `js/segnalazione-civica.js`
**Stima:** piccola — 45 min

---

### 3.3 — Filtri mappa: target touch più grandi su mobile

**Problema**
I chip filtri (urgenza, categoria) hanno altezza < 44px su mobile, sotto il minimo raccomandato per touch target (WCAG 2.5.5).

**Soluzione**
- Aumentare `padding` dei chip a `0.45rem 0.85rem` su mobile.
- Applicare `min-height: 44px` sui `.filter-chip` in media query `max-width: 640px`.

**File:** `css/map.css`
**Stima:** minima — 20 min

---

### 3.4 — Messaggio vuoto nella lista segnalazioni

**Problema**
Se nessuna segnalazione corrisponde al filtro attivo, la lista è semplicemente vuota. L'utente non capisce se è un errore o se non ci sono dati.

**Soluzione**
- Mostrare un messaggio esplicativo:
  > 🔍 Nessuna segnalazione trovata con i filtri selezionati.
  > [Rimuovi filtri]

**File:** `js/map.js` (`renderList`)
**Stima:** minima — 30 min

---

### 3.5 — Anteprima step 4 aggiornata live

**Problema**
L'anteprima del messaggio nel passo 4 non si aggiorna automaticamente al cambio dei dropdown. L'utente deve interagire con qualcosa per vederla aggiornare.

**Soluzione**
- Aggiungere `onchange="updatePreview()"` ai dropdown `areaSelect` e `socialSelect` (già presenti su `areaSelect` tramite `updateAreaInfo` che chiama `updatePreview`).
- Verificare che `ccAreaSelect` e `ccCustomEmails` triggerino anche `updatePreview` — già implementato.
- Nessuna modifica sostanziale necessaria, solo verifica e testing.

**File:** `js/segnalazione-civica.js`
**Stima:** minima — 15 min

---

## Priorità 4 — Accessibilità (WCAG 2.1 AA)

Da implementare progressivamente, non bloccanti ma importanti per inclusività.

---

| # | Problema | Soluzione | File | Effort |
|---|----------|-----------|------|--------|
| 4.1 | Step bar usa `<div>` | Convertire in `<ol>` con `role="progressbar"` e `aria-current="step"` | `segnalazione-civica.html` | Medio |
| 4.2 | Chip filtri sono `<div onclick>` | Convertire in `<button type="button">` | `js/map.js` | Piccolo |
| 4.3 | Canvas grafici senza `aria-label` | Aggiungere `aria-label` e `role="img"` descrittivi | `statistiche.html` | Minimo |
| 4.4 | Emoji come icone senza alt | Aggiungere `aria-hidden="true"` sulle emoji decorative | Tutti i file HTML | Piccolo |
| 4.5 | Modal info senza `role="dialog"` | Aggiungere `role="dialog"`, `aria-modal="true"`, focus trap | `segnalazione-civica.html` | Medio |
| 4.6 | Input `<select>` senza `aria-label` | Aggiungere `aria-label` espliciti ai select senza `<label>` visibile | `segnalazione-civica.html` | Minimo |

---

## Fuori scope (per ora)

Funzionalità desiderabili ma che richiedono modifiche architetturali significative:

- **Clustering markers** — richiede Leaflet.markercluster (nuova dipendenza)
- **Ricerca geografica** — richiede integrazione Nominatim o Google Places
- **Export grafici PNG** — richiede Chart.js plugin aggiuntivo
- **Filtro per periodo temporale** — richiede parsing date e nuovo componente UI
- **Notifiche push** — richiede Service Worker e backend

---

## Ordine di esecuzione consigliato

```
Sprint 1 (1 giorno)
  ├─ 1.2 Validazione email live          [30 min]
  ├─ 1.5 Token risoluzione nella success  [30 min]
  ├─ 2.2 Rimuovi alert() da closeSuccess  [30 min]
  └─ 2.3 Helper text campo CC email       [20 min]

Sprint 2 (1 giorno)
  ├─ 1.3 Area destinataria obbligatoria   [1 ora]
  ├─ 2.1 Avviso coordinate EXIF           [1 ora]
  └─ 3.4 Messaggio vuoto lista mappa      [30 min]

Sprint 3 (1 giorno)
  ├─ 1.4 Timeout caricamento CSV          [1 ora]
  ├─ 1.1 Feedback invio (banner avviso)   [2 ore]
  └─ 2.4 Stat cards filtrate              [1 ora]

Sprint 4 (mezzo giorno)
  ├─ 3.1 Tooltip categorie                [1 ora]
  ├─ 3.3 Touch target chip filtri         [20 min]
  └─ 4.2 Chip → button accessibili        [30 min]
```

---

*Piano creato il 01/03/2026 — da aggiornare man mano che i fix vengono implementati.*
