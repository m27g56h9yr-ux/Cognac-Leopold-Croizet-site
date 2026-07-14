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
