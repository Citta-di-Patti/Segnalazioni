/* ═══════════════════════════════════════════════════════
   SegnalaOra — Gestione tema chiaro/scuro
   Incluso in tutte le pagine prima del body
   ═══════════════════════════════════════════════════════ */
(function () {
  var STORAGE_KEY = 'segnalaora-theme';

  function applyTheme(dark) {
    document.documentElement.classList.toggle('dark', dark);
  }

  function updateBtn() {
    var btn = document.getElementById('themeToggle');
    if (!btn) return;
    var dark = document.documentElement.classList.contains('dark');
    btn.innerHTML = dark
      ? '<i class="fa-solid fa-sun"></i>'
      : '<i class="fa-solid fa-moon"></i>';
    btn.title = dark ? 'Passa al tema chiaro' : 'Passa al tema scuro';
  }

  // Applica il tema salvato subito (prima del render della pagina)
  applyTheme(localStorage.getItem(STORAGE_KEY) === 'dark');

  // Funzione globale chiamata dal pulsante
  window.toggleTheme = function () {
    var isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem(STORAGE_KEY, isDark ? 'light' : 'dark');
    applyTheme(!isDark);
    updateBtn();
    // Notifica le pagine che vogliono reagire (es. statistiche per ridisegnare grafici)
    document.dispatchEvent(new CustomEvent('themechange', { detail: { dark: !isDark } }));
  };

  // Aggiorna l'icona del pulsante quando il DOM è pronto
  document.addEventListener('DOMContentLoaded', updateBtn);
})();
