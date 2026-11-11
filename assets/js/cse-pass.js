/* Accès CSE Maison des Pierres : garde le laissez-passer CSE remis par la boutique
   (valable jusqu'à 3 heures), l'ajoute aux liens vers boutique.mdpierre.com et
   affiche les prix CSE sur ce site pendant la visite. Aucune donnée personnelle. */
(function () {
  var KEY = 'mdpCsePass', CACHE = 'mdpCsePrices', SHOP = 'boutique.mdpierre.com';
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
    var url = new URL(window.location.href), incoming = url.searchParams.get('mdp_cse_pass');
    if (incoming !== null) {
      if (FORMAT.test(incoming)) {
        try { window.localStorage.setItem(KEY, JSON.stringify({ p: incoming, e: parseInt(incoming.split('.')[1], 10) * 1000 })); } catch (e) {}
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

  /* ---------- Affichage des prix CSE ---------- */
  var pass = read();
  if (!pass) return;
  var data = null;
  function money(cents) {
    return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }
  function codeOf(link) {
    try { return new URL(link.getAttribute('href') || '', window.location.href).searchParams.get('mdp_ref'); } catch (e) { return null; }
  }
  function style() {
    if (document.getElementById('mdp-cse-style')) return;
    var s = document.createElement('style');
    s.id = 'mdp-cse-style';
    s.textContent = '.mdp-cse-bar{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:#263e31;color:#fff;font:600 14px/1.4 Arial,sans-serif;text-align:center;padding:10px 14px;box-shadow:0 -4px 16px rgba(0,0,0,.18)}' +
      '.mdp-cse-note{display:block;margin:8px 0 0;font:600 14px/1.4 Arial,sans-serif;color:#2f6b2a}.mdp-cse-note del{color:#8a806f;font-weight:400;margin-left:4px}' +
      '.mdp-cse-price del{font-weight:400;opacity:.65;margin-right:6px}';
    document.head.appendChild(s);
  }
  function bar() {
    if (document.getElementById('mdp-cse-bar') || !document.body) return;
    var b = document.createElement('div');
    b.id = 'mdp-cse-bar'; b.className = 'mdp-cse-bar'; b.setAttribute('role', 'status');
    b.textContent = 'Tarif CSE ' + data.label + ' : vos prix CSE sont affichés pendant votre visite.';
    document.body.appendChild(b);
    document.body.style.paddingBottom = '48px';
  }
  function apply() {
    if (!data) return;
    style(); bar();
    document.querySelectorAll('a[href*="' + SHOP + '"][href*="mdp_ref="]').forEach(function (link) {
      var code = codeOf(link), p = code && data.prices[code];
      var row = link.closest('.eo-shop-row');
      var strong = row ? row.querySelector('strong') : null;
      if (strong) {
        if (p && p.cse < p.list && strong.getAttribute('data-mdp-cse') !== code) {
          strong.setAttribute('data-mdp-cse', code);
          strong.classList.add('mdp-cse-price');
          strong.innerHTML = '<del>' + money(p.list) + '</del>' + money(p.cse) + ' <small>TTC</small>';
        }
        return;
      }
      var box = link.closest('#mdp-direct-order') || link.parentNode;
      if (!box) return;
      var note = box.querySelector('.mdp-cse-note');
      if (!p || p.cse >= p.list) { if (note) note.remove(); return; }
      if (!note) { note = document.createElement('span'); note.className = 'mdp-cse-note'; box.appendChild(note); }
      var text = 'Tarif CSE ' + data.label + ' : ' + money(p.cse) + ' TTC';
      if (note.getAttribute('data-code') !== code) {
        note.setAttribute('data-code', code);
        note.textContent = text + ' ';
        var del = document.createElement('del'); del.textContent = money(p.list); note.appendChild(del);
      }
    });
  }
  function start() {
    var timer = null;
    apply();
    new MutationObserver(function () { clearTimeout(timer); timer = setTimeout(apply, 120); })
      .observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['href'] });
  }
  function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  try {
    var cached = JSON.parse(window.sessionStorage.getItem(CACHE) || 'null');
    if (cached && cached.p === pass && cached.t > Date.now() - 600000 && cached.d && cached.d.open) data = cached.d;
  } catch (e) {}
  if (data) { ready(start); return; }
  fetch('https://' + SHOP + '/commander/?mdp_cse_prices=' + encodeURIComponent(pass), { credentials: 'omit', cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || d.open !== true || !d.prices) { try { window.localStorage.removeItem(KEY); } catch (e) {} return; }
      data = d;
      try { window.sessionStorage.setItem(CACHE, JSON.stringify({ p: pass, t: Date.now(), d: d })); } catch (e) {}
      ready(start);
    })
    .catch(function () {});
})();
