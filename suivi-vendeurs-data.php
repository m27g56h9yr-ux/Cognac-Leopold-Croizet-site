<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('X-Robots-Tag: noindex, nofollow, noarchive');

$sources = [
    ['product_slug' => 'vs', 'market_key' => 'ru', 'market' => 'Russie', 'seller' => 'AV.ru', 'product' => 'Cognac Léopold Croizet VS', 'source_url' => 'https://av.ru/i/1021709', 'fallback_price' => 4849, 'fallback_note' => 'Collection AV.ru indexée : prix public 4 849 ₽.'],
    ['product_slug' => 'vsop', 'market_key' => 'ru', 'market' => 'Russie', 'seller' => 'AV.ru', 'product' => 'Cognac Léopold Croizet VSOP', 'source_url' => 'https://av.ru/i/174054', 'fallback_price' => 5480, 'fallback_list_price' => 6449, 'fallback_note' => 'Collection AV.ru indexée : prix public 5 480 ₽, prix avant remise 6 449 ₽.'],
    ['product_slug' => 'napoleon', 'market_key' => 'ru', 'market' => 'Russie', 'seller' => 'AV.ru', 'product' => 'Cognac Léopold Croizet Napoléon', 'source_url' => 'https://av.ru/i/1020490', 'fallback_price' => 7190, 'fallback_list_price' => 8490, 'fallback_note' => 'Collection AV.ru indexée : prix public 7 190 ₽, prix avant remise 8 490 ₽.'],
    ['product_slug' => 'xo', 'market_key' => 'ru', 'market' => 'Russie', 'seller' => 'AV.ru', 'product' => 'Cognac Léopold Croizet XO', 'source_url' => 'https://av.ru/i/1020491', 'fallback_price' => 8790, 'fallback_note' => 'Fiche AV.ru indexée : prix public 8 790 ₽.'],
    ['product_slug' => 'xo-exception', 'market_key' => 'ru', 'market' => 'Russie', 'seller' => 'AV.ru', 'product' => 'Cognac Léopold Croizet XO Exception', 'source_url' => 'https://av.ru/i/1005624', 'fallback_price' => 22980, 'fallback_note' => 'Page marque AV.ru indexée : prix public 22 980 ₽.'],
    ['product_slug' => 'extra', 'market_key' => 'ru', 'market' => 'Russie', 'seller' => 'AV.ru', 'product' => 'Cognac Léopold Croizet Extra', 'source_url' => 'https://av.ru/i/174057', 'fallback_price' => 57790, 'fallback_note' => 'Page marque AV.ru indexée : prix public 57 790 ₽.'],
    ['product_slug' => 'excellence', 'market_key' => 'ru', 'market' => 'Russie', 'seller' => 'AV.ru', 'product' => 'Cognac Léopold Croizet Excellence', 'source_url' => 'https://av.ru/i/231809', 'fallback_price' => 76990, 'fallback_note' => 'Collection AV.ru indexée : prix public 76 990 ₽.'],
    ['product_slug' => 'heritage', 'market_key' => 'ru', 'market' => 'Russie', 'seller' => 'AV.ru', 'product' => 'Cognac Léopold Croizet Héritage', 'source_url' => 'https://av.ru/search/?freeText=Leopold%20Croizet%20Heritage'],
    ['product_slug' => 'valentine', 'market_key' => 'ru', 'market' => 'Russie', 'seller' => 'AV.ru', 'product' => 'Cognac Léopold Croizet Valentine XO', 'source_url' => 'https://av.ru/i/178511', 'fallback_price' => 6490, 'fallback_list_price' => 7690, 'fallback_note' => 'Page marque AV.ru indexée : prix public 6 490 ₽, prix avant remise 7 690 ₽.'],
];

$rows = array_map('refresh_seller_row', $sources);

echo json_encode([
    'ok' => true,
    'updatedAt' => gmdate(DATE_ATOM),
    'updatedAtLabel' => gmdate('Y-m-d H:i:s') . ' UTC',
    'rows' => $rows,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "\n";

function refresh_seller_row(array $source): array
{
    $result = fetch_remote_html($source['source_url']);
    $row = public_source_fields($source) + [
        'schema_status' => 'Lecture directe AV.ru non confirmée',
        'offers' => null,
        'review' => null,
        'aggregateRating' => null,
        'notes' => 'Lecture automatique impossible pour cette source partenaire.',
        'refreshed_at' => gmdate(DATE_ATOM),
        'refresh_status' => 'error',
    ];

    if (!$result['ok'] || !is_string($result['body']) || $result['body'] === '') {
        return fallback_seller_row($source);
    }

    $nodes = extract_json_ld_nodes($result['body']);
    $product = first_schema_type($nodes, 'Product');
    $offers = $product ? schema_value($product, 'offers') : first_schema_type($nodes, 'Offer');
    $review = $product ? schema_value($product, 'review') : first_schema_type($nodes, 'Review');
    $aggregateRating = $product ? schema_value($product, 'aggregateRating') : first_schema_type($nodes, 'AggregateRating');

    if ($product) {
        $missing = [];
        if ($offers === null) $missing[] = 'offers';
        if ($review === null) $missing[] = 'review';
        if ($aggregateRating === null) $missing[] = 'aggregateRating';

        $row['schema_status'] = 'Product JSON-LD détecté';
        $row['notes'] = $missing
            ? 'Product JSON-LD actualisé. Non exposé : ' . implode(', ', $missing) . '.'
            : 'Product JSON-LD actualisé avec offers, review et aggregateRating.';
    } elseif ($offers || $review || $aggregateRating) {
        $row['schema_status'] = 'Données structurées détectées sans Product';
        $row['notes'] = 'Offer, Review ou AggregateRating détecté hors bloc Product.';
    } elseif ($nodes) {
        $row['schema_status'] = 'Aucun Product/Offer/Review/AggregateRating détecté';
        $row['notes'] = 'Page actualisée : aucun Product rich result exploitable dans le JSON-LD publié.';
    } else {
        $row['schema_status'] = 'Aucun JSON-LD exploitable détecté';
        $row['notes'] = 'Page actualisée : aucune donnée JSON-LD exploitable détectée.';
    }

    $hidePrices = should_hide_prices_for_request();
    $row['offers'] = $hidePrices ? remove_price_fields($offers) : $offers;
    $row['review'] = $review;
    $row['aggregateRating'] = $aggregateRating;
    $row['refresh_status'] = 'ok';
    if ($hidePrices && $offers !== $row['offers']) {
        $row['notes'] .= ' Prix masqué pour ce contexte visiteur.';
    }

    return $row;
}

function public_source_fields(array $source): array
{
    return [
        'product_slug' => $source['product_slug'],
        'market_key' => $source['market_key'],
        'market' => $source['market'],
        'seller' => $source['seller'],
        'product' => $source['product'],
        'source_url' => $source['source_url'],
    ];
}

function fallback_seller_row(array $source): array
{
    $row = public_source_fields($source) + [
        'schema_status' => 'Fiche produit AV.ru non trouvée dans l’index public',
        'offers' => null,
        'review' => null,
        'aggregateRating' => null,
        'notes' => 'Le lien partenaire publié ouvre une recherche AV.ru. Aucune fiche produit AV.ru indexée fiable n’a été trouvée pour ce produit ; review et aggregateRating restent donc non exposés.',
        'refreshed_at' => gmdate(DATE_ATOM),
        'refresh_status' => 'manual_review',
    ];

    if (!isset($source['fallback_price'])) {
        return $row;
    }

    $offers = fallback_offer($source);
    if (should_hide_prices_for_request()) {
        $offers = remove_price_fields($offers);
    }

    $row['schema_status'] = 'Valeurs AV.ru issues de l’index public';
    $row['offers'] = $offers;
    $row['notes'] = ($source['fallback_note'] ?? 'Valeur AV.ru issue de l’index public.') . ' L’accès direct AV.ru reste restreint depuis les serveurs de contrôle ; review et aggregateRating ne sont pas exposés dans l’extrait public.';
    $row['refresh_status'] = 'fallback';
    return $row;
}

function fallback_offer(array $source): array
{
    $offer = [
        '@type' => 'Offer',
        'price' => $source['fallback_price'],
        'priceCurrency' => 'RUB',
        'availability' => 'https://schema.org/InStock',
        'itemCondition' => 'https://schema.org/NewCondition',
        'seller' => ['@type' => 'Organization', 'name' => 'AV.ru'],
        'url' => $source['source_url'],
    ];

    if (isset($source['fallback_list_price'])) {
        $offer['priceSpecification'] = [
            ['@type' => 'UnitPriceSpecification', 'name' => 'Prix public relevé', 'price' => $source['fallback_price'], 'priceCurrency' => 'RUB'],
            ['@type' => 'UnitPriceSpecification', 'name' => 'Prix avant remise indiqué', 'price' => $source['fallback_list_price'], 'priceCurrency' => 'RUB'],
        ];
    }

    return $offer;
}

function fetch_remote_html(string $url): array
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => 18,
            CURLOPT_ENCODING => '',
            CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; LeopoldCroizetSellerTracking/1.0)',
            CURLOPT_HTTPHEADER => [
                'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language: fr-FR,fr;q=0.9,en;q=0.8',
            ],
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        return [
            'ok' => $body !== false && $status >= 200 && $status < 400,
            'status' => $status,
            'body' => $body === false ? '' : (string) $body,
            'error' => $error,
        ];
    }

    $context = stream_context_create([
        'http' => [
            'timeout' => 18,
            'header' => "User-Agent: Mozilla/5.0 (compatible; LeopoldCroizetSellerTracking/1.0)\r\nAccept-Language: fr-FR,fr;q=0.9,en;q=0.8\r\n",
        ],
    ]);
    $body = @file_get_contents($url, false, $context);
    $status = 0;
    if (isset($http_response_header) && is_array($http_response_header)) {
        foreach ($http_response_header as $header) {
            if (preg_match('/^HTTP\/\S+\s+(\d+)/', $header, $match)) {
                $status = (int) $match[1];
                break;
            }
        }
    }

    return [
        'ok' => $body !== false && $status >= 200 && $status < 400,
        'status' => $status,
        'body' => $body === false ? '' : (string) $body,
        'error' => '',
    ];
}

function extract_json_ld_nodes(string $html): array
{
    if (!preg_match_all('~<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>~is', $html, $matches)) {
        return [];
    }

    $nodes = [];
    foreach ($matches[1] as $raw) {
        $json = trim(html_entity_decode($raw, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        if ($json === '') continue;

        $decoded = json_decode($json, true);
        if (json_last_error() !== JSON_ERROR_NONE) continue;
        collect_schema_nodes($decoded, $nodes);
    }

    return $nodes;
}

function collect_schema_nodes($value, array &$nodes): void
{
    if (!is_array($value)) return;

    if (is_assoc($value)) {
        if (isset($value['@type'])) $nodes[] = $value;
        foreach ($value as $child) collect_schema_nodes($child, $nodes);
        return;
    }

    foreach ($value as $child) collect_schema_nodes($child, $nodes);
}

function first_schema_type(array $nodes, string $type): ?array
{
    foreach ($nodes as $node) {
        if (schema_type_matches($node, $type)) return $node;
    }
    return null;
}

function schema_type_matches(array $node, string $type): bool
{
    if (!isset($node['@type'])) return false;
    $types = is_array($node['@type']) ? $node['@type'] : [$node['@type']];
    foreach ($types as $candidate) {
        if (strcasecmp((string) $candidate, $type) === 0) return true;
    }
    return false;
}

function schema_value(array $node, string $key)
{
    return array_key_exists($key, $node) ? $node[$key] : null;
}

function remove_price_fields($value)
{
    if (is_array($value)) {
        if (is_assoc($value)) {
            $clean = [];
            foreach ($value as $key => $child) {
                if ($key === 'price' || $key === 'priceCurrency') continue;
                $clean[$key] = remove_price_fields($child);
            }
            return $clean;
        }
        return array_map('remove_price_fields', $value);
    }
    return $value;
}

function should_hide_prices_for_request(): bool
{
    $accept = strtolower($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '');
    return preg_match('/\bzh\b|\bzh-|-(cn|hk|mo|tw)\b/', $accept) === 1;
}

function is_assoc(array $value): bool
{
    if ($value === []) return false;
    return array_keys($value) !== range(0, count($value) - 1);
}
