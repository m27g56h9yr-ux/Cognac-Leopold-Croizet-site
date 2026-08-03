(function (window, document) {
    'use strict';

    var script = document.currentScript || document.getElementById('lc-partner-offer-js');
    var productSlug = script && script.getAttribute('data-product-slug');
    var seedUrl = '/api/partner-offers-seed.json';
    var requestSequence = 0;

    var productVariants = {
        vs: {
            '700 ml': variant('vs', '700 ml', '70 cl', 'VS 70 cl', 'https://av.ru/i/1021709', true),
            '350 ml': variant('vs-350', '350 ml', '35 cl', 'VS 35 cl', 'https://av.ru/i/533004', false)
        },
        vsop: {
            '700 ml': variant('vsop', '700 ml', '70 cl', 'VSOP 70 cl', 'https://av.ru/i/174054', true),
            '350 ml': variant('vsop-350', '350 ml', '35 cl', 'VSOP 35 cl', 'https://av.ru/i/234764', false),
            'vsop-gift-set-70cl-2-glasses': variant(
                'vsop-gift',
                'vsop-gift-set-70cl-2-glasses',
                '70 cl + 2 бокала',
                'VSOP 70 cl + 2 бокала',
                'https://av.ru/i/1016261',
                false
            )
        },
        xo: {
            '350 ml': variant('xo', '350 ml', '35 cl', 'XO 35 cl', 'https://av.ru/i/1020491', false)
        }
    };

    function variant(offerSlug, modelKey, partnerSize, label, url, schemaEligible) {
        return {
            offerSlug: offerSlug,
            modelKey: modelKey,
            partnerSize: partnerSize,
            label: label,
            url: url,
            schemaEligible: schemaEligible
        };
    }

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

    function offerFromPayload(payload, offerSlug) {
        if (!payload || typeof payload !== 'object') return null;
        if (payload.offer && payload.offer.slug === offerSlug) return payload.offer;
        if (payload.offers && payload.offers[offerSlug]) return payload.offers[offerSlug];
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

    function selectedModelKey() {
        var selected = document.querySelector('[data-product-model-option][aria-pressed="true"]');
        if (selected) return selected.getAttribute('data-product-model-option') || '';
        var box = document.querySelector('.container-btn-commander-produit.lc-partner-offer-control .prix-produit-container');
        var size = box && box.getAttribute('data-partner-product-size');
        if (size === '70 cl') return '700 ml';
        if (size === '35 cl') return '350 ml';
        return '';
    }

    function defaultVariant() {
        var control = document.querySelector('.container-btn-commander-produit.lc-partner-offer-control');
        var box = control && control.querySelector('.prix-produit-container');
        var link = control && control.querySelector('.btn-commander-produit');
        var size = box && box.getAttribute('data-partner-product-size');
        var label = box && box.querySelector('span');
        var url = link && link.getAttribute('href');
        if (!control || !size || !url) return null;
        return variant(productSlug, selectedModelKey(), size, label ? label.textContent : size, url, true);
    }

    function variantForModel(modelKey) {
        var configured = productVariants[productSlug];
        if (configured) return configured[modelKey] || null;
        return defaultVariant();
    }

    function clearProductJsonLdOffers() {
        var pagePath = window.location.pathname.replace(/\/?$/, '/');
        document.querySelectorAll('script[type="application/ld+json"]').forEach(function (jsonScript) {
            var data;
            var changed = false;
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
                if (node.offers) {
                    delete node.offers;
                    changed = true;
                }
            });
            if (changed) jsonScript.textContent = JSON.stringify(data);
        });
    }

    function setVariantContext(config) {
        var control = document.querySelector('.container-btn-commander-produit.lc-partner-offer-control');
        if (!control) return false;
        clearProductJsonLdOffers();
        if (!config) {
            control.hidden = true;
            return false;
        }

        var box = control.querySelector('.prix-produit-container');
        var link = control.querySelector('.btn-commander-produit');
        if (!box || !link) return false;
        control.hidden = false;

        var seller = document.createElement('small');
        seller.className = 'lc-partner-offer-seller';
        seller.textContent = 'AV.ru';
        var label = document.createElement('span');
        label.textContent = config.label;
        box.replaceChildren(seller, label);
        box.setAttribute('data-partner-product-size', config.partnerSize);
        box.removeAttribute('data-partner-offer-price');
        box.removeAttribute('data-partner-offer-currency');
        box.removeAttribute('data-partner-offer-availability');
        box.removeAttribute('data-partner-offer-checked-at');
        box.setAttribute('aria-label', 'AV.ru: ' + config.label);

        link.setAttribute('href', config.url);
        link.setAttribute('aria-label', 'Заказать ' + config.label + ' на AV.ru');
        return true;
    }

    function updateVisibleOffer(offer, config) {
        var control = document.querySelector('.container-btn-commander-produit.lc-partner-offer-control');
        var box = control && control.querySelector('.prix-produit-container');
        if (!box || !setVariantContext(config)) return false;

        var seller = document.createElement('small');
        seller.className = 'lc-partner-offer-seller';
        seller.textContent = 'AV.ru · Москва';

        var price = document.createElement('span');
        price.textContent = formatRubles(offer.price);

        var listPriceValue = Number(offer.listPrice || 0);
        var listPrice = null;
        if (Number.isFinite(listPriceValue) && listPriceValue > Number(offer.price)) {
            listPrice = document.createElement('small');
            listPrice.className = 'lc-partner-offer-list-price';
            listPrice.textContent = 'вместо ' + formatRubles(listPriceValue);
        }

        var status = document.createElement('small');
        status.className = 'lc-partner-offer-status';
        status.textContent = offer.partnerSize + ' · ' + (offer.availability === 'https://schema.org/InStock'
            ? 'В наличии'
            : 'Уточнить наличие');

        box.replaceChildren(seller, price);
        if (listPrice) box.appendChild(listPrice);
        box.appendChild(status);
        box.setAttribute('data-partner-offer-price', String(offer.price));
        box.setAttribute('data-partner-offer-currency', 'RUB');
        box.setAttribute('data-partner-offer-availability', offer.availability);
        box.setAttribute('data-partner-offer-checked-at', offer.checkedAt);
        box.setAttribute('aria-label', 'AV.ru, Москва: ' + offer.partnerSize + ', ' + formatRubles(offer.price) + ', ' + status.textContent);
        return true;
    }

    function updateProductJsonLd(offer, payload, config) {
        if (!config.schemaEligible) return;
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

                var partnerSize = sizeInMilliliters(offer.partnerSize);
                var productSize = sizeInMilliliters(node.size);
                if (partnerSize === null || productSize === null || partnerSize !== productSize) return;

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

    function applyPayload(payload, config) {
        var offer = offerFromPayload(payload, config.offerSlug);
        if (!offer || !isFresh(offer, payload)) return false;
        if (!Number.isFinite(Number(offer.price)) || Number(offer.price) <= 0) return false;
        if (offer.url !== config.url) return false;
        if (offer.partnerSize !== config.partnerSize) return false;
        if (!/^https:\/\/schema\.org\/(?:InStock|OutOfStock)$/.test(offer.availability || '')) return false;
        offer.price = Number(offer.price);
        if (!updateVisibleOffer(offer, config)) return false;
        updateProductJsonLd(offer, payload, config);
        return true;
    }

    function loadVariant(config) {
        var sequence = ++requestSequence;
        if (!setVariantContext(config)) return Promise.resolve(false);
        var endpoint = '/api/partner-offers.php?slug=' + encodeURIComponent(config.offerSlug);

        return fetchJson(endpoint)
            .then(function (payload) {
                if (sequence !== requestSequence) return false;
                if (applyPayload(payload, config)) return true;
                return fetchJson(seedUrl).then(function (seedPayload) {
                    if (sequence !== requestSequence) return false;
                    return applyPayload(seedPayload, config);
                });
            })
            .catch(function () {
                if (sequence !== requestSequence) return false;
                return fetchJson(seedUrl)
                    .then(function (seedPayload) {
                        if (sequence !== requestSequence) return false;
                        return applyPayload(seedPayload, config);
                    })
                    .catch(function () { return false; });
            });
    }

    function loadSelectedVariant(modelKey) {
        return loadVariant(variantForModel(modelKey || selectedModelKey()));
    }

    document.addEventListener('click', function (event) {
        if (!productVariants[productSlug]) return;
        var option = event.target.closest('[data-product-model-option], [data-volume-option]');
        if (!option) return;
        loadSelectedVariant(
            option.getAttribute('data-product-model-option')
            || option.getAttribute('data-volume-option')
            || ''
        );
    });

    window.lcPartnerOfferReady = productSlug && window.fetch
        ? loadSelectedVariant(selectedModelKey())
        : Promise.resolve(false);
})(window, document);
