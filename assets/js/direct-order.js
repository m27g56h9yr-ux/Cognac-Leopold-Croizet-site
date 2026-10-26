(function () {
    'use strict';
    var box = document.getElementById('mdp-direct-order');
    if (!box) return;
    var links = JSON.parse(box.getAttribute('data-order-links'));
    var link = box.querySelector('[data-order-link]');
    var format = box.querySelector('[data-order-format]');
    var status = box.querySelector('[data-order-status]');
    var product = box.getAttribute('data-order-product');
    var previousModel;

    function update() {
        var selected = document.querySelector('[data-product-model-option][aria-pressed="true"], [data-volume-option][aria-selected="true"]');
        if (!selected) return; // Single-format page: keep its verified static link.
        var model = selected.getAttribute('data-product-model-option') || selected.getAttribute('data-volume-option');
        if (model === previousModel) return;
        var label = selected.textContent.trim();
        var href = links[model];
        format.textContent = label;
        if (href) {
            link.setAttribute('href', href);
            link.removeAttribute('aria-disabled');
            link.textContent = 'Commander';
            link.setAttribute('aria-label', 'Commander ' + product + ' ' + label + ' sur boutique.mdpierre.com');
        } else {
            link.removeAttribute('href');
            link.setAttribute('aria-disabled', 'true');
            link.textContent = 'Indisponible en ligne';
            link.setAttribute('aria-label', product + ' ' + label + ' : ce format n’est pas encore disponible en ligne');
        }
        if (previousModel !== undefined) {
            status.textContent = href ? 'Commande en ligne : ' + label + '.' : label + ' : ce format n’est pas encore disponible en ligne.';
        }
        previousModel = model;
    }

    // Sync after both the main selector and the details selector have updated.
    // Never substitute another SKU for an unsupported format.
    update();
    document.querySelectorAll('[data-product-model-selector], [data-volume-selector]').forEach(function (selector) {
        new MutationObserver(update).observe(selector, {
            subtree: true, attributes: true, attributeFilter: ['aria-pressed', 'aria-selected']
        });
    });
})();
