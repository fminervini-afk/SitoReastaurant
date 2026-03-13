
(function () {
  var KEY = 'tikiFishTheme';

 
  if (localStorage.getItem(KEY) === 'dark') {
    document.documentElement.classList.add('dark-mode-pre');
  }

  function applyTheme(dark) {
    document.body.classList.toggle('dark-mode', dark);
    document.documentElement.classList.remove('dark-mode-pre');
    var btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.textContent = dark ? '☀️' : '🌙';
      btn.setAttribute('aria-label', dark ? 'Attiva tema chiaro' : 'Attiva tema scuro');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var saved = localStorage.getItem(KEY) === 'dark';
    applyTheme(saved);

    var btn = document.getElementById('theme-toggle');
    if (!btn) return;

    btn.addEventListener('click', function () {
      var isDark = document.body.classList.contains('dark-mode');
      var next = !isDark;
      localStorage.setItem(KEY, next ? 'dark' : 'light');
      applyTheme(next);
    });
  });
})();
