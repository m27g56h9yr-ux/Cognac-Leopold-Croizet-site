(function (window, document) {
    'use strict';

    var endpoint = '/api/conversion.php';
    var allowedCampaignSources = {
        google: 'google',
        bing: 'bing',
        yandex: 'yandex',
        baidu: 'baidu',
        chatgpt: 'chatgpt',
        openai: 'chatgpt',
        perplexity: 'perplexity',
        copilot: 'copilot',
        newsletter: 'newsletter',
        instagram: 'instagram',
        facebook: 'facebook',
        youtube: 'youtube'
    };

    function productSlugFromPath(pathname) {
        var match = pathname.match(/\/collection\/([a-z0-9-]+)\/?$/i);
        return match ? match[1].toLowerCase() : '';
    }

    function sourceFromHostname(hostname) {
        var host = String(hostname || '').toLowerCase();
        if (!host) return 'direct';
        if (host === window.location.hostname.toLowerCase()) return 'internal';
        if (/(^|\.)google\./.test(host)) return 'google';
        if (/(^|\.)bing\.com$/.test(host)) return 'bing';
        if (/(^|\.)yandex\./.test(host)) return 'yandex';
        if (/(^|\.)baidu\.com$/.test(host)) return 'baidu';
        if (/(^|\.)(chatgpt\.com|openai\.com)$/.test(host)) return 'chatgpt';
        if (/(^|\.)perplexity\.ai$/.test(host)) return 'perplexity';
        if (/(^|\.)copilot\.microsoft\.com$/.test(host)) return 'copilot';
        if (/(^|\.)instagram\.com$/.test(host)) return 'instagram';
        if (/(^|\.)facebook\.com$/.test(host)) return 'facebook';
        if (/(^|\.)youtube\.com$/.test(host)) return 'youtube';
        return 'other';
    }

    function trafficSource() {
        try {
            var campaignSource = new URLSearchParams(window.location.search).get('utm_source');
            if (campaignSource) {
                var normalizedCampaign = campaignSource.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                return allowedCampaignSources[normalizedCampaign] || 'campaign_other';
            }
            return document.referrer ? sourceFromHostname(new URL(document.referrer).hostname) : 'direct';
        } catch (error) {
            return 'other';
        }
    }

    function trackConversion(eventName, details) {
        if (!window.fetch) return;
        var context = details || {};
        var payload = {
            event_name: eventName,
            action_type: context.action_type || '',
            language: (document.documentElement.lang || '').slice(0, 2).toLowerCase(),
            page_path: window.location.pathname,
            product_slug: context.product_slug || productSlugFromPath(window.location.pathname),
            traffic_source: trafficSource()
        };

        window.fetch(endpoint, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
        }).catch(function () {
            return undefined;
        });
    }

    window.lcTrackConversion = trackConversion;

    document.addEventListener('click', function (event) {
        var link = event.target.closest && event.target.closest('a[href]');
        if (!link) return;
        var rawHref = link.getAttribute('href') || '';

        if (/^mailto:/i.test(rawHref)) {
            trackConversion('contact_clicked', { action_type: 'email' });
            return;
        }
        if (/^tel:/i.test(rawHref)) {
            trackConversion('contact_clicked', { action_type: 'phone' });
            return;
        }

        try {
            var target = new URL(link.href, window.location.href);
            if (target.hostname === 'av.ru' || /\.av\.ru$/i.test(target.hostname)) {
                trackConversion('partner_order_clicked', {
                    action_type: 'av_ru',
                    product_slug: productSlugFromPath(window.location.pathname)
                });
                return;
            }
            if (target.origin === window.location.origin && /\/rencontre\/?$/i.test(target.pathname)) {
                trackConversion('contact_clicked', { action_type: 'visit_page' });
            }
        } catch (error) {
            return;
        }
    });

    function observeNewsletterSuccess() {
        if (!window.MutationObserver || !document.body) return;
        var trackedForms = new WeakSet();
        var selector = '.container-newsletter .info-systeme.success';

        function inspect(root) {
            var elements = [];
            if (root.nodeType === 1 && root.matches && root.matches(selector)) elements.push(root);
            if (root.querySelectorAll) elements = elements.concat(Array.prototype.slice.call(root.querySelectorAll(selector)));
            elements.forEach(function (info) {
                var form = info.closest('.container-newsletter');
                if (!form || trackedForms.has(form)) return;
                trackedForms.add(form);
                trackConversion('newsletter_submitted', { action_type: 'newsletter' });
            });
        }

        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                inspect(mutation.target);
            });
        });
        observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
        inspect(document.body);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', observeNewsletterSuccess, { once: true });
    } else {
        observeNewsletterSuccess();
    }
})(window, document);

/* Maison des Pierres: direct orders for the French commercial opening. */
(function () {
  'use strict';
  var catalogue = {"vs": {"700": "LC0001", "350": "LC0002"}, "vsop": {"700": "LC0003", "350": "LC0004"}, "napoleon": {"700": "LC0007"}, "xo": {"700": "LC0009"}, "xo-exception": {"700": "LC0011"}, "extra": {"700": "LC0012"}, "excellence": {"700": "LC0013"}, "heritage": {"700": "LC0014"}, "valentine": {"350": "LC0015"}};
  var match = location.pathname.match(/^\/collection\/([a-z0-9-]+)\/$/);
  if (!match || !catalogue[match[1]]) return;
  
  function mount() {
    if (document.getElementById('mdp-direct-order')) return;
    var anchor = document.querySelector('.colonne-droite-produit');
    if (!anchor) return;
    var formats = catalogue[match[1]];
    var box = document.createElement('div');
    box.id = 'mdp-direct-order';
    box.style.cssText = 'margin:24px 0;max-width:100%;font-family:inherit;line-height:1.5';
    var link = document.createElement('a');
    link.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 22px;box-sizing:border-box;background:#342c22;color:#fff;border:1px solid #342c22;text-decoration:none;font-size:15px;max-width:100%';
    var note = document.createElement('p');
    note.style.cssText = 'margin:8px 0 0;font-size:13px;line-height:1.5';
    note.textContent = 'Livraison en France métropolitaine ou retrait gratuit à la propriété.';
    box.append(link, note);
    anchor.appendChild(box);
    function update() {
      var selected = document.querySelector('[data-product-model-option][aria-pressed="true"], [data-volume-option][aria-selected="true"]');
      var value = selected ? (selected.getAttribute('data-product-model-option') || selected.getAttribute('data-volume-option') || '') : '';
      var volume = value ? value.match(/^([0-9]+) ml$/) : null;
      // Never substitute a saleable format for a different selected format.
      var ml = selected ? (volume ? volume[1] : '') : Object.keys(formats)[0];
      var sku = formats[ml];
      if (sku) {
        var url = new URL('https://boutique.mdpierre.com/commander/');
        url.searchParams.set('mdp_ref', sku);
        url.searchParams.set('mdp_lang', 'fr');
        link.href = url.href;
        link.textContent = 'Commander — ' + (Number(ml) / 10) + ' cl';
        link.removeAttribute('aria-disabled');
        link.style.opacity = '1';
      } else {
        link.removeAttribute('href');
        link.setAttribute('aria-disabled', 'true');
        link.textContent = 'Ce format n’est pas encore disponible en ligne';
        link.style.opacity = '.6';
      }
    }
    update();
    // Observe selection attributes: both sites use different click propagation.
    document.querySelectorAll('[data-product-model-selector], [data-volume-selector]').forEach(function (selector) {
      new MutationObserver(update).observe(selector, {subtree:true,attributes:true,attributeFilter:['aria-pressed','aria-selected']});
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
