<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['ok' => false, 'status' => 'method_not_allowed']);
}

$config = conversion_config();
if (!is_same_origin_request($config)) {
    json_response(403, ['ok' => false, 'status' => 'origin_not_allowed']);
}

$input = request_data();
$eventName = clean_token((string) ($input['event_name'] ?? ''), 48);
$actionType = clean_token((string) ($input['action_type'] ?? ''), 48);
$language = normalize_language((string) ($input['language'] ?? ''));
$pagePath = normalize_page_path((string) ($input['page_path'] ?? ''));
$productSlug = clean_token((string) ($input['product_slug'] ?? ''), 80);
$trafficSource = normalize_traffic_source((string) ($input['traffic_source'] ?? 'direct'));

$allowedActions = [
    'contact_clicked' => ['visit_page', 'email', 'phone'],
    'newsletter_submitted' => ['newsletter'],
    'partner_order_clicked' => ['av_ru'],
];

if (!isset($allowedActions[$eventName]) || !in_array($actionType, $allowedActions[$eventName], true)) {
    json_response(422, ['ok' => false, 'status' => 'invalid_event']);
}

if ($language === '' || $pagePath === '') {
    json_response(422, ['ok' => false, 'status' => 'invalid_context']);
}

if ($eventName === 'partner_order_clicked' && $productSlug === '') {
    json_response(422, ['ok' => false, 'status' => 'missing_product']);
}

$record = [
    gmdate('c'),
    $eventName,
    $language,
    $pagePath,
    page_group($pagePath),
    $actionType,
    $productSlug,
    $trafficSource,
];

$saveResult = append_local_record($config, $record);
if (!$saveResult['ok']) {
    json_response(500, ['ok' => false, 'status' => $saveResult['status']]);
}

$digestStatus = send_digest_if_due($config, (string) $saveResult['path']);

json_response(200, [
    'ok' => true,
    'status' => 'recorded',
    'digest' => $digestStatus,
]);

function conversion_config(): array
{
    $config = [
        'storage_path' => dirname(__DIR__) . '/conversion-data/conversions.csv',
        'digest_state_path' => dirname(__DIR__) . '/conversion-data/last-digest-at.txt',
        'notification_to' => 'cognac@mdpierre.com',
        'notification_from' => 'analytics@cognac-leopold-croizet.com',
        'site_name' => 'Cognac Léopold Croizet',
        'digest_interval_seconds' => 86400,
        'email_enabled' => true,
        'allowed_origins' => [
            'https://cognac-leopold-croizet.com',
            'https://www.cognac-leopold-croizet.com',
        ],
    ];

    $localConfig = __DIR__ . '/conversion-config.php';
    if (is_file($localConfig)) {
        $override = require $localConfig;
        if (is_array($override)) {
            $config = array_merge($config, $override);
        }
    }

    $testStoragePath = getenv('LC_CONVERSION_STORAGE_PATH');
    if (is_string($testStoragePath) && $testStoragePath !== '') {
        $config['storage_path'] = $testStoragePath;
        $config['digest_state_path'] = dirname($testStoragePath) . '/last-digest-at.txt';
    }

    $testOrigin = getenv('LC_CONVERSION_ALLOWED_ORIGIN');
    if (is_string($testOrigin) && $testOrigin !== '') {
        $config['allowed_origins'][] = rtrim($testOrigin, '/');
    }

    if (getenv('LC_CONVERSION_DISABLE_EMAIL') === '1') {
        $config['email_enabled'] = false;
    }

    return $config;
}

function request_data(): array
{
    $contentType = (string) ($_SERVER['CONTENT_TYPE'] ?? '');
    if (stripos($contentType, 'application/json') !== false) {
        $payload = json_decode((string) file_get_contents('php://input'), true);
        return is_array($payload) ? $payload : [];
    }

    return $_POST;
}

function is_same_origin_request(array $config): bool
{
    $allowedOrigins = array_map(
        static fn ($origin): string => rtrim((string) $origin, '/'),
        (array) ($config['allowed_origins'] ?? []),
    );

    $origin = rtrim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''), '/');
    if ($origin !== '') {
        return in_array($origin, $allowedOrigins, true);
    }

    $referer = (string) ($_SERVER['HTTP_REFERER'] ?? '');
    if ($referer === '') {
        return false;
    }

    $scheme = (string) parse_url($referer, PHP_URL_SCHEME);
    $host = (string) parse_url($referer, PHP_URL_HOST);
    if ($scheme === '' || $host === '') {
        return false;
    }

    return in_array($scheme . '://' . $host, $allowedOrigins, true);
}

function append_local_record(array $config, array $record): array
{
    $path = (string) $config['storage_path'];
    $directory = dirname($path);
    $header = [
        'created_at',
        'event_name',
        'language',
        'page_path',
        'page_group',
        'action_type',
        'product_slug',
        'traffic_source',
    ];

    if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
        error_log('Conversion endpoint cannot create storage directory.');
        return ['ok' => false, 'status' => 'storage_directory_error'];
    }

    $isNewFile = !is_file($path) || filesize($path) === 0;
    $handle = fopen($path, 'ab');
    if ($handle === false) {
        error_log('Conversion endpoint cannot open conversions.csv.');
        return ['ok' => false, 'status' => 'storage_open_error'];
    }

    if (!flock($handle, LOCK_EX)) {
        fclose($handle);
        error_log('Conversion endpoint cannot lock conversions.csv.');
        return ['ok' => false, 'status' => 'storage_lock_error'];
    }

    if ($isNewFile) {
        fputcsv($handle, $header);
    }

    fputcsv($handle, $record);
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    @chmod($path, 0640);

    return ['ok' => true, 'path' => $path];
}

function send_digest_if_due(array $config, string $csvPath): string
{
    if (empty($config['email_enabled']) || trim((string) ($config['notification_to'] ?? '')) === '') {
        return 'disabled';
    }

    $statePath = (string) $config['digest_state_path'];
    $directory = dirname($statePath);
    if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
        return 'state_directory_error';
    }

    $state = fopen($statePath, 'c+');
    if ($state === false || !flock($state, LOCK_EX)) {
        if (is_resource($state)) {
            fclose($state);
        }
        return 'state_lock_error';
    }

    rewind($state);
    $lastDigestAt = (int) trim((string) stream_get_contents($state));
    $now = time();
    $interval = max(3600, (int) ($config['digest_interval_seconds'] ?? 86400));

    if ($lastDigestAt > 0 && ($now - $lastDigestAt) < $interval) {
        flock($state, LOCK_UN);
        fclose($state);
        return 'not_due';
    }

    $digestCsv = build_digest_csv($csvPath, $lastDigestAt);
    if ($digestCsv === '') {
        flock($state, LOCK_UN);
        fclose($state);
        return 'empty';
    }

    $sent = send_digest_email($config, $digestCsv);
    if ($sent) {
        ftruncate($state, 0);
        rewind($state);
        fwrite($state, (string) $now);
        fflush($state);
        @chmod($statePath, 0640);
    }

    flock($state, LOCK_UN);
    fclose($state);
    return $sent ? 'sent' : 'email_failed';
}

function build_digest_csv(string $csvPath, int $afterTimestamp): string
{
    if (!is_file($csvPath)) {
        return '';
    }

    $source = fopen($csvPath, 'rb');
    $target = fopen('php://temp', 'w+');
    if ($source === false || $target === false) {
        if (is_resource($source)) {
            fclose($source);
        }
        if (is_resource($target)) {
            fclose($target);
        }
        return '';
    }

    $header = fgetcsv($source);
    if (!is_array($header)) {
        fclose($source);
        fclose($target);
        return '';
    }

    fputcsv($target, $header);
    $rowCount = 0;
    while (($row = fgetcsv($source)) !== false) {
        $createdAt = strtotime((string) ($row[0] ?? '')) ?: 0;
        if ($afterTimestamp > 0 && $createdAt <= $afterTimestamp) {
            continue;
        }
        fputcsv($target, $row);
        $rowCount++;
    }

    fclose($source);
    if ($rowCount === 0) {
        fclose($target);
        return '';
    }

    rewind($target);
    $csv = (string) stream_get_contents($target);
    fclose($target);
    return $csv;
}

function send_digest_email(array $config, string $digestCsv): bool
{
    $boundary = 'lc-conversion-' . bin2hex(random_bytes(12));
    $to = (string) $config['notification_to'];
    $from = (string) $config['notification_from'];
    $siteName = (string) $config['site_name'];
    $subject = 'Rapport quotidien des conversions - ' . $siteName;

    $body = [
        '--' . $boundary,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        'Le fichier joint contient les nouvelles actions commerciales enregistrées depuis le précédent rapport.',
        'Il ne contient ni adresse e-mail, ni adresse IP, ni navigateur, ni identifiant visiteur.',
        '',
        '--' . $boundary,
        'Content-Type: text/csv; charset=UTF-8; name="conversions.csv"',
        'Content-Disposition: attachment; filename="conversions.csv"',
        'Content-Transfer-Encoding: base64',
        '',
        chunk_split(base64_encode($digestCsv)),
        '--' . $boundary . '--',
        '',
    ];

    $headers = [
        'From: ' . $from,
        'Reply-To: ' . $to,
        'MIME-Version: 1.0',
        'Content-Type: multipart/mixed; boundary="' . $boundary . '"',
    ];

    return mail($to, encoded_subject($subject), implode("\r\n", $body), implode("\r\n", $headers));
}

function encoded_subject(string $subject): string
{
    return '=?UTF-8?B?' . base64_encode($subject) . '?=';
}

function normalize_language(string $value): string
{
    $language = strtolower(substr(trim($value), 0, 2));
    return in_array($language, ['fr', 'en', 'ru', 'da', 'sv', 'no', 'zh'], true) ? $language : '';
}

function normalize_page_path(string $value): string
{
    $path = (string) parse_url(trim($value), PHP_URL_PATH);
    if ($path === '' || $path[0] !== '/' || strlen($path) > 320) {
        return '';
    }

    return preg_match('#^/[A-Za-z0-9._~%/-]*$#', $path) === 1 ? $path : '';
}

function normalize_traffic_source(string $value): string
{
    $source = clean_token($value, 32);
    $allowed = [
        'direct', 'internal', 'google', 'bing', 'yandex', 'baidu',
        'chatgpt', 'perplexity', 'copilot', 'newsletter',
        'instagram', 'facebook', 'youtube', 'campaign_other', 'other',
    ];
    return in_array($source, $allowed, true) ? $source : 'other';
}

function clean_token(string $value, int $maxLength): string
{
    $value = strtolower(trim($value));
    if ($value === '' || strlen($value) > $maxLength) {
        return '';
    }

    return preg_match('/^[a-z0-9_-]+$/', $value) === 1 ? $value : '';
}

function page_group(string $path): string
{
    if (preg_match('#/collection/[^/]+/#', $path) === 1) {
        return 'product';
    }
    if (preg_match('#/(?:rencontre|dossier-de-presse|environnement)/#', $path) === 1) {
        return trim((string) basename(rtrim($path, '/')));
    }
    return $path === '/' || preg_match('#^/(?:en|ru|da|sv|no|zh)/$#', $path) === 1 ? 'home' : 'content';
}

function json_response(int $code, array $payload): void
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
