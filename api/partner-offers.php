<?php
declare(strict_types=1);

require_once __DIR__ . '/partner-offers-lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('X-Robots-Tag: noindex, nofollow, noarchive');

$slug = strtolower(trim((string) ($_GET['slug'] ?? '')));
$definitions = lc_partner_definitions();
if (!isset($definitions[$slug])) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'error' => 'unknown_product'], JSON_UNESCAPED_SLASHES) . "\n";
    exit;
}

$cache = lc_partner_load_cache();
$payload = lc_partner_public_payload($slug, $cache);
$body = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if (!is_string($body)) {
    http_response_code(500);
    echo "{\"ok\":false,\"error\":\"encoding_failed\"}\n";
    exit;
}

echo $body . "\n";

if (!empty($payload['refreshScheduled'])) {
    ignore_user_abort(true);
    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
    } else {
        @ob_flush();
        flush();
    }
    lc_partner_refresh_offer($slug);
}
