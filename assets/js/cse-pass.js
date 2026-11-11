/* Accès CSE Maison des Pierres : garde le laissez-passer CSE remis par la boutique
   (valable jusqu'à 3 heures) et l'ajoute aux liens vers boutique.mdpierre.com.
   Aucune donnée personnelle, rien n'est envoyé ailleurs. */
(function () {
  var KEY = 'mdpCsePass', SHOP = 'boutique.mdpierre.com';
  var FORMAT = /^[a-z0-9-]{1,40}\.[0-9]{9,11}\.[a-f0-9]{64}$/;
  function read() {
    try {
      var v = JSON.parse(window.localStorage.getItem(KEY) || 'null');
      if (v && typeof v.p === 'string' && FORMAT.test(v.p) && v.e > Date.now()) return v.p;
      window.localStorage.removeItem(KEY);
    } catch (e) {}
    return null;
  }
  try {
    var url = new URL(window.location.href), pass = url.searchParams.get('mdp_cse_pass');
    if (pass !== null) {
      if (FORMAT.test(pass)) {
        try { window.localStorage.setItem(KEY, JSON.stringify({ p: pass, e: parseInt(pass.split('.')[1], 10) * 1000 })); } catch (e) {}
      }
      url.searchParams.delete('mdp_cse_pass');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
  } catch (e) {}
  function tag(link) {
    var pass = read();
    if (!pass || !link || !link.href) return;
    try {
      var target = new URL(link.href, window.location.href);
      if (target.hostname !== SHOP) return;
      target.searchParams.set('mdp_cse_pass', pass);
      link.href = target.toString();
    } catch (e) {}
  }
  ['click', 'auxclick', 'contextmenu', 'touchstart'].forEach(function (type) {
    document.addEventListener(type, function (event) {
      var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
      if (link) tag(link);
    }, { capture: true, passive: true });
  });
})();
