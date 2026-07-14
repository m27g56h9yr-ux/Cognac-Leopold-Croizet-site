<?php
declare(strict_types=1);

require_once __DIR__ . '/api/partner-offers-lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('X-Robots-Tag: noindex, nofollow, noarchive');

$cache = lc_partner_load_cache();
$definitions = lc_partner_definitions();
$rows = [];

foreach ($definitions as $slug => $definition) {
    $offer = isset($cache['offers'][$slug]) && is_array($cache['offers'][$slug]) ? $cache['offers'][$slug] : null;
    $fresh = lc_partner_offer_is_fresh($offer);
    $rows[] = [
        'product_slug' => $slug,
        'market_key' => 'ru',
        'market' => 'Russie',
        'seller' => 'AV.ru',
        'product' => $definition['productName'],
        'partner_size' => $definition['partnerSize'],
        'source_url' => 'https://av.ru/i/' . $definition['productId'],
        'checked_at' => $offer['checkedAt'] ?? null,
        'geographic_context' => $offer['geographicContext'] ?? 'Moscow (msk)',
        'schema_status' => $fresh ? 'Offre AV.ru fraîche chargée depuis le cache dynamique' : 'Offre AV.ru à actualiser',
        'offers' => $fresh ? [
            '@type' => 'Offer',
            'price' => $offer['price'],
            'priceCurrency' => 'RUB',
            'availability' => $offer['availability'],
            'itemCondition' => 'https://schema.org/NewCondition',
            'seller' => ['@type' => 'Organization', 'name' => 'AV.ru'],
            'url' => $offer['url'],
        ] : null,
        'review' => null,
        'aggregateRating' => null,
        'notes' => $fresh
            ? 'Prix et disponibilité contrôlés pour Moscou. La page produit recharge ce cache à chaque visite et conserve toujours le bouton AV.ru.'
            : 'Le prix n’est plus affiché, mais le bouton AV.ru reste disponible pendant la nouvelle tentative de contrôle.',
        'refreshed_at' => gmdate(DATE_ATOM),
        'refresh_status' => $fresh ? 'fresh_cache' : 'stale_cache',
    ];
}

$heritageSource = 'https://av.ru/search/?freeText=Leopold%20Croizet%20Heritage';
$rows[] = [
    'product_slug' => 'heritage',
    'market_key' => 'ru',
    'market' => 'Russie',
    'seller' => 'AV.ru',
    'product' => 'Cognac Léopold Croizet Héritage',
    'partner_size' => null,
    'source_url' => $heritageSource,
    'checked_at' => '2026-07-14T13:49:50Z',
    'geographic_context' => 'Moscow (msk)',
    'schema_status' => 'Aucune fiche produit AV.ru exacte',
    'offers' => null,
    'review' => null,
    'aggregateRating' => null,
    'notes' => 'La destination disponible reste une recherche AV.ru. Aucun prix ni BuyAction n’est exposé tant qu’une fiche exacte n’est pas identifiée.',
    'refreshed_at' => gmdate(DATE_ATOM),
    'refresh_status' => 'manual_review',
];

echo json_encode([
    'ok' => true,
    'updatedAt' => gmdate(DATE_ATOM),
    'updatedAtLabel' => gmdate('Y-m-d H:i:s') . ' UTC',
    'maxOfferAgeDays' => 7,
    'rows' => $rows,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "\n";
