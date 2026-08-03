<?php
declare(strict_types=1);

const LC_PARTNER_MAX_AGE_SECONDS = 604800;
const LC_PARTNER_REFRESH_INTERVAL_SECONDS = 900;

function lc_partner_definitions(): array
{
    return [
        'vs' => ['productId' => '1021709', 'productName' => 'Cognac Léopold Croizet VS', 'partnerSize' => '70 cl', 'grams' => 700, 'tokens' => ['croizet', 'vs']],
        'vs-350' => ['productId' => '533004', 'productName' => 'Cognac Léopold Croizet VS', 'partnerSize' => '35 cl', 'grams' => 350, 'tokens' => ['croizet', 'vs']],
        'vsop' => ['productId' => '174054', 'productName' => 'Cognac Léopold Croizet VSOP', 'partnerSize' => '70 cl', 'grams' => 700, 'tokens' => ['croizet', 'vsop']],
        'vsop-350' => ['productId' => '234764', 'productName' => 'Cognac Léopold Croizet VSOP', 'partnerSize' => '35 cl', 'grams' => 350, 'tokens' => ['croizet', 'vsop']],
        'vsop-gift' => ['productId' => '1016261', 'productName' => 'Cognac Léopold Croizet VSOP', 'partnerSize' => '70 cl + 2 бокала', 'grams' => 700, 'tokens' => ['croizet', 'vsop', '2 бокала']],
        'napoleon' => ['productId' => '1020490', 'productName' => 'Cognac Léopold Croizet Napoléon', 'partnerSize' => '70 cl', 'grams' => 700, 'tokens' => ['croizet', 'napoleon']],
        'xo' => ['productId' => '1020491', 'productName' => 'Cognac Léopold Croizet XO', 'partnerSize' => '35 cl', 'grams' => 350, 'tokens' => ['croizet', 'xo']],
        'xo-exception' => ['productId' => '1005624', 'productName' => 'Cognac Léopold Croizet XO Exception', 'partnerSize' => '70 cl', 'grams' => 700, 'tokens' => ['croizet', 'exception', 'xo']],
        'extra' => ['productId' => '174057', 'productName' => 'Cognac Léopold Croizet Extra', 'partnerSize' => '70 cl', 'grams' => 700, 'tokens' => ['croizet', 'extra']],
        'excellence' => ['productId' => '231809', 'productName' => 'Cognac Léopold Croizet Excellence', 'partnerSize' => '70 cl', 'grams' => 700, 'tokens' => ['croizet', 'excellence']],
        'valentine' => ['productId' => '178511', 'productName' => 'Cognac Léopold Croizet Valentine XO', 'partnerSize' => '35 cl', 'grams' => 350, 'tokens' => ['croizet', 'valentine', 'xo']],
    ];
}

function lc_partner_seed_file(): string
{
    return __DIR__ . '/partner-offers-seed.json';
}

function lc_partner_cache_directory(): string
{
    return dirname(__DIR__) . '/partner-data';
}

function lc_partner_cache_file(): string
{
    return lc_partner_cache_directory() . '/avru-offers.json';
}

function lc_partner_read_json(string $file): ?array
{
    if (!is_file($file) || !is_readable($file)) return null;
    $decoded = json_decode((string) file_get_contents($file), true);
    return is_array($decoded) ? $decoded : null;
}

function lc_partner_load_cache(): array
{
    $cache = lc_partner_read_json(lc_partner_cache_file());
    if (is_array($cache) && isset($cache['offers']) && is_array($cache['offers'])) return $cache;

    $seed = lc_partner_read_json(lc_partner_seed_file());
    if (!is_array($seed) || !isset($seed['offers']) || !is_array($seed['offers'])) {
        return [
            'generatedAt' => gmdate(DATE_ATOM),
            'market' => 'RU',
            'city' => 'Moscow',
            'cityCode' => 'msk',
            'source' => 'AV.ru OCC API v1',
            'maxAgeSeconds' => LC_PARTNER_MAX_AGE_SECONDS,
            'refreshIntervalSeconds' => LC_PARTNER_REFRESH_INTERVAL_SECONDS,
            'offers' => [],
        ];
    }

    lc_partner_write_cache($seed);
    return $seed;
}

function lc_partner_write_cache(array $cache): bool
{
    $directory = lc_partner_cache_directory();
    if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) return false;

    $encoded = json_encode($cache, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if (!is_string($encoded)) return false;

    $temporary = lc_partner_cache_file() . '.tmp-' . bin2hex(random_bytes(4));
    if (file_put_contents($temporary, $encoded . "\n", LOCK_EX) === false) return false;
    @chmod($temporary, 0640);
    return rename($temporary, lc_partner_cache_file());
}

function lc_partner_offer_is_fresh(?array $offer, ?int $maxAgeSeconds = null): bool
{
    if (!is_array($offer) || empty($offer['checkedAt'])) return false;
    $checkedAt = strtotime((string) $offer['checkedAt']);
    if ($checkedAt === false) return false;
    $maxAge = $maxAgeSeconds ?? LC_PARTNER_MAX_AGE_SECONDS;
    return $maxAge > 0 && time() <= $checkedAt + $maxAge;
}

function lc_partner_offer_needs_refresh(?array $offer): bool
{
    return !lc_partner_offer_is_fresh($offer, LC_PARTNER_REFRESH_INTERVAL_SECONDS);
}

function lc_partner_public_payload(string $slug, array $cache): array
{
    $offer = isset($cache['offers'][$slug]) && is_array($cache['offers'][$slug]) ? $cache['offers'][$slug] : null;
    return [
        'ok' => $offer !== null,
        'market' => 'RU',
        'city' => 'Moscow',
        'cityCode' => 'msk',
        'maxAgeSeconds' => (int) ($cache['maxAgeSeconds'] ?? LC_PARTNER_MAX_AGE_SECONDS),
        'refreshIntervalSeconds' => (int) ($cache['refreshIntervalSeconds'] ?? LC_PARTNER_REFRESH_INTERVAL_SECONDS),
        'fresh' => lc_partner_offer_is_fresh($offer),
        'refreshScheduled' => lc_partner_offer_needs_refresh($offer),
        'offer' => $offer,
    ];
}

function lc_partner_refresh_offer(string $slug): bool
{
    $definitions = lc_partner_definitions();
    if (!isset($definitions[$slug])) return false;

    $directory = lc_partner_cache_directory();
    if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) return false;
    $lock = fopen($directory . '/refresh.lock', 'c');
    if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) {
        if (is_resource($lock)) fclose($lock);
        return false;
    }

    try {
        $cache = lc_partner_load_cache();
        $current = isset($cache['offers'][$slug]) && is_array($cache['offers'][$slug]) ? $cache['offers'][$slug] : null;
        if (!lc_partner_offer_needs_refresh($current)) return true;

        $result = lc_partner_fetch_avru_product($definitions[$slug]['productId']);
        $cache['lastRefreshAttemptAt'] = gmdate(DATE_ATOM);
        if (!$result['ok']) {
            $cache['lastRefreshStatus'] = 'error';
            $cache['lastRefreshHttpStatus'] = $result['status'];
            lc_partner_write_cache($cache);
            return false;
        }

        $offer = lc_partner_validated_offer($slug, $definitions[$slug], $result['data']);
        if ($offer === null) {
            $cache['lastRefreshStatus'] = 'validation_failed';
            $cache['lastRefreshHttpStatus'] = $result['status'];
            lc_partner_write_cache($cache);
            return false;
        }

        $cache['generatedAt'] = gmdate(DATE_ATOM);
        $cache['lastRefreshStatus'] = 'ok';
        $cache['lastRefreshHttpStatus'] = $result['status'];
        $cache['offers'][$slug] = $offer;
        return lc_partner_write_cache($cache);
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function lc_partner_fetch_avru_product(string $productId): array
{
    $url = 'https://av.ru/occ/api/v1/products/' . rawurlencode($productId);
    $requestId = gmdate('YmdHis') . '-' . bin2hex(random_bytes(8));
    $headers = [
        'Accept: application/json, text/plain, */*',
        'X-WARP-UID: ' . $requestId,
        'X-Request-ID: ' . $requestId,
    ];

    if (function_exists('curl_init')) {
        $curl = curl_init($url);
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_TIMEOUT => 6,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_USERAGENT => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
            CURLOPT_ENCODING => '',
        ]);
        $body = curl_exec($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        curl_close($curl);
    } else {
        $context = stream_context_create(['http' => [
            'method' => 'GET',
            'timeout' => 6,
            'ignore_errors' => true,
            'header' => implode("\r\n", array_merge($headers, [
                'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
            ])),
        ]]);
        $body = @file_get_contents($url, false, $context);
        $status = 0;
        foreach ($http_response_header ?? [] as $header) {
            if (preg_match('/^HTTP\/\S+\s+(\d{3})/', $header, $match)) $status = (int) $match[1];
        }
    }

    $decoded = is_string($body) ? json_decode($body, true) : null;
    return [
        'ok' => $status >= 200 && $status < 300 && is_array($decoded),
        'status' => $status,
        'data' => is_array($decoded) ? $decoded : null,
    ];
}

function lc_partner_validated_offer(string $slug, array $definition, array $data): ?array
{
    if ((string) ($data['code'] ?? '') !== $definition['productId']) return null;
    if (empty($data['active']) || empty($data['purchasable'])) return null;

    $partnerName = (string) ($data['name'] ?? '');
    $normalizedName = strtolower($partnerName);
    foreach ($definition['tokens'] as $token) {
        if (strpos($normalizedName, strtolower($token)) === false) return null;
    }

    $unit = (string) ($data['unitSummary']['formattedUnit'] ?? '');
    $grams = (int) preg_replace('/\D+/u', '', $unit);
    if ($grams !== (int) $definition['grams']) return null;

    $price = $data['priceData']['price'] ?? null;
    if (!is_numeric($price) || (float) $price <= 0 || (float) $price > 10000000) return null;

    $stockLevel = isset($data['stockData']['stockLevel']) ? (int) $data['stockData']['stockLevel'] : null;
    $stockCode = (string) ($data['stockData']['status']['code'] ?? '');
    if (!in_array($stockCode, ['inStock', 'outOfStock'], true)) return null;

    return [
        'slug' => $slug,
        'productId' => $definition['productId'],
        'productName' => $definition['productName'],
        'partnerProductName' => $partnerName,
        'partnerSize' => $definition['partnerSize'],
        'price' => (float) $price,
        'priceCurrency' => 'RUB',
        'availability' => $stockCode === 'inStock' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        'stockLevel' => $stockLevel,
        'url' => 'https://av.ru/i/' . $definition['productId'],
        'checkedAt' => gmdate(DATE_ATOM),
        'geographicContext' => 'Moscow (msk)',
    ];
}
