(function (window, document) {
    'use strict';

    var script = document.currentScript || document.getElementById('lc-partner-offer-js');
    var slug = script && script.getAttribute('data-product-slug');
    var endpoint = '/api/partner-offers.php?slug=' + encodeURIComponent(slug || '');
    var seedUrl = '/api/partner-offers-seed.json';

    function fetchJson(url) {
        return window.fetch(url, {
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { Accept: 'application/json' }
        }).then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        });
    }

    function offerFromPayload(payload) {
        if (!payload || typeof payload !== 'object') return null;
        if (payload.offer && payload.offer.slug === slug) return payload.offer;
        if (payload.offers && payload.offers[slug]) return payload.offers[slug];
        return null;
    }

    function isFresh(offer, payload) {
        var checkedAt = Date.parse(offer && offer.checkedAt);
        var maxAgeSeconds = Number((payload && payload.maxAgeSeconds) || 604800);
        return Number.isFinite(checkedAt)
            && Number.isFinite(maxAgeSeconds)
            && maxAgeSeconds > 0
            && Date.now() <= checkedAt + maxAgeSeconds * 1000;
    }

    function validUntil(offer, payload) {
        var checkedAt = Date.parse(offer.checkedAt);
        var maxAgeSeconds = Number((payload && payload.maxAgeSeconds) || 604800);
        return new Date(checkedAt + maxAgeSeconds * 1000).toISOString().slice(0, 10);
    }

    function formatRubles(value) {
        return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value) + ' ₽';
    }

    function sizeInMilliliters(value) {
        var match = String(value || '').trim().toLowerCase().match(/^(\d+(?:[.,]\d+)?)\s*(ml|cl|l)$/);
        if (!match) return null;
        var quantity = Number(match[1].replace(',', '.'));
        if (!Number.isFinite(quantity) || quantity <= 0) return null;
        if (match[2] === 'l') return quantity * 1000;
        if (match[2] === 'cl') return quantity * 10;
        return quantity;
    }

    function offerMatchesProductSize(offer, product) {
        var partnerSize = sizeInMilliliters(offer.partnerSize);
        var productSize = sizeInMilliliters(product && product.size);
        return partnerSize === null || productSize === null || partnerSize === productSize;
    }

    function updateVisibleOffer(offer) {
        var control = document.querySelector('.container-btn-commander-produit.lc-partner-offer-control');
        var box = control && control.querySelector('.prix-produit-container');
        if (!box) return false;

        var seller = document.createElement('small');
        seller.className = 'lc-partner-offer-seller';
        seller.textContent = 'AV.ru · Москва';

        var price = document.createElement('span');
        price.textContent = formatRubles(offer.price);

        var status = document.createElement('small');
        status.className = 'lc-partner-offer-status';
        status.textContent = offer.partnerSize + ' · ' + (offer.availability === 'https://schema.org/InStock'
            ? 'В наличии'
            : 'Уточнить наличие');

        box.replaceChildren(seller, price, status);
        box.setAttribute('data-partner-offer-price', String(offer.price));
        box.setAttribute('data-partner-offer-currency', 'RUB');
        box.setAttribute('data-partner-offer-availability', offer.availability);
        box.setAttribute('data-partner-offer-checked-at', offer.checkedAt);
        box.setAttribute('aria-label', 'AV.ru, Москва: ' + offer.partnerSize + ', ' + formatRubles(offer.price) + ', ' + status.textContent);
        return true;
    }

    function updateProductJsonLd(offer, payload) {
        var pagePath = window.location.pathname.replace(/\/?$/, '/');

        document.querySelectorAll('script[type="application/ld+json"]').forEach(function (jsonScript) {
            var data;
            var scriptChanged = false;
            try {
                data = JSON.parse(jsonScript.textContent || '');
            } catch (error) {
                return;
            }

            var nodes = Array.isArray(data) ? data : [data];
            nodes.forEach(function (node) {
                if (!node || node['@type'] !== 'Product') return;
                try {
                    var productPath = new URL(node.url || '', window.location.origin).pathname.replace(/\/?$/, '/');
                    if (productPath !== pagePath) return;
                } catch (error) {
                    return;
                }

                if (!offerMatchesProductSize(offer, node)) {
                    if (node.offers) {
                        delete node.offers;
                        scriptChanged = true;
                    }
                    return;
                }

                node.offers = {
                    '@type': 'Offer',
                    url: offer.url,
                    price: offer.price,
                    priceCurrency: 'RUB',
                    availability: offer.availability,
                    itemCondition: 'https://schema.org/NewCondition',
                    validFrom: offer.checkedAt.slice(0, 10),
                    priceValidUntil: validUntil(offer, payload),
                    areaServed: 'RU',
                    seller: { '@type': 'Organization', name: 'AV.ru' }
                };
                scriptChanged = true;
            });

            if (scriptChanged) jsonScript.textContent = JSON.stringify(data);
        });
    }

    function applyPayload(payload) {
        var offer = offerFromPayload(payload);
        if (!offer || !isFresh(offer, payload)) return false;
        if (!Number.isFinite(Number(offer.price)) || Number(offer.price) <= 0) return false;
        if (!/^https:\/\/av\.ru\/i\/\d+\/?$/.test(offer.url || '')) return false;
        if (!/^https:\/\/schema\.org\/(?:InStock|OutOfStock)$/.test(offer.availability || '')) return false;
        if (!/^(?:35|70) cl$/.test(offer.partnerSize || '')) return false;
        offer.price = Number(offer.price);
        if (!updateVisibleOffer(offer)) return false;
        updateProductJsonLd(offer, payload);
        return true;
    }

    function loadOffer() {
        if (!slug || !window.fetch) return Promise.resolve(false);
        return fetchJson(endpoint)
            .catch(function () { return fetchJson(seedUrl); })
            .then(applyPayload)
            .catch(function () { return false; });
    }

    window.lcPartnerOfferReady = loadOffer();
})(window, document);
