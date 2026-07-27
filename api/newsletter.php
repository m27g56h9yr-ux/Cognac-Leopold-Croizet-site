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

$config = newsletter_config();
$input = request_data();
$email = strtolower(trim((string) ($input['email'] ?? $input['newsletter'] ?? '')));

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(422, ['ok' => false, 'status' => 'invalid_email']);
}

$record = [
    gmdate('c'),
    $email,
    clean_field((string) ($input['language'] ?? '')),
    clean_field((string) ($input['page'] ?? '')),
    clean_field((string) ($input['consent_version'] ?? 'newsletter-news-2026-06-11')),
    clean_field((string) ($_SERVER['REMOTE_ADDR'] ?? '')),
    clean_field((string) ($_SERVER['HTTP_USER_AGENT'] ?? '')),
    clean_field((string) ($_SERVER['HTTP_REFERER'] ?? '')),
    clean_field((string) ($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '')),
];

$risk = newsletter_risk_signals($input);
$saveResult = append_local_record($config, $record);
if (!$saveResult['ok']) {
    append_risk_event($config, $risk, 'storage_error');
    json_response(500, ['ok' => false, 'status' => $saveResult['status']]);
}

if (!$saveResult['created']) {
    append_risk_event($config, $risk, 'duplicate');
    json_response(200, [
        'ok' => true,
        'status' => 'already_registered',
    ]);
}

$mailSent = empty($config['email_enabled'])
    ? true
    : send_updated_csv($config, (string) $saveResult['path'], $email);
append_risk_event($config, $risk, $mailSent ? 'saved' : 'saved_email_failed');

json_response(200, [
    'ok' => true,
    'status' => $mailSent ? 'saved_and_emailed' : 'saved_email_failed',
]);

function newsletter_config(): array
{
    $storageDirectory = dirname(__DIR__) . '/newsletter-data';
    $config = [
        'storage_path' => $storageDirectory . '/subscriptions.csv',
        'risk_log_path' => $storageDirectory . '/submission-risk.csv',
        'notification_to' => 'leo.croizet@free.fr',
        'notification_from' => 'newsletter@cognac-leopold-croizet.com',
        'site_name' => 'Cognac Léopold Croizet',
        'email_enabled' => true,
    ];

    $localConfig = __DIR__ . '/newsletter-config.php';
    if (is_file($localConfig)) {
        $override = require $localConfig;
        if (is_array($override)) {
            $config = array_merge($config, array_filter($override, static fn ($value) => $value !== null && $value !== ''));
        }
    }

    $testStoragePath = getenv('LC_NEWSLETTER_STORAGE_PATH');
    if (is_string($testStoragePath) && $testStoragePath !== '') {
        $config['storage_path'] = $testStoragePath;
        $config['risk_log_path'] = dirname($testStoragePath) . '/submission-risk.csv';
    }

    $testRiskLogPath = getenv('LC_NEWSLETTER_RISK_LOG_PATH');
    if (is_string($testRiskLogPath) && $testRiskLogPath !== '') {
        $config['risk_log_path'] = $testRiskLogPath;
    }

    if (getenv('LC_NEWSLETTER_DISABLE_EMAIL') === '1') {
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

function append_local_record(array $config, array $record): array
{
    $path = (string) $config['storage_path'];
    $directory = dirname($path);
    $header = newsletter_header();

    if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
        error_log('Newsletter endpoint cannot create storage directory.');
        return ['ok' => false, 'status' => 'storage_directory_error'];
    }

    $handle = fopen($path, 'c+b');
    if ($handle === false) {
        error_log('Newsletter endpoint cannot open subscriptions.csv.');
        return ['ok' => false, 'status' => 'storage_open_error'];
    }

    if (!flock($handle, LOCK_EX)) {
        fclose($handle);
        error_log('Newsletter endpoint cannot lock subscriptions.csv.');
        return ['ok' => false, 'status' => 'storage_lock_error'];
    }

    $stats = fstat($handle);
    $isNewFile = !is_array($stats) || (int) ($stats['size'] ?? 0) === 0;
    if ($isNewFile) {
        fputcsv($handle, $header);
    } else {
        rewind($handle);
        $existingHeader = fgetcsv($handle);
        $emailIndex = is_array($existingHeader) ? array_search('email', $existingHeader, true) : false;
        if ($emailIndex === false) {
            $emailIndex = 1;
        }

        while (($existingRecord = fgetcsv($handle)) !== false) {
            $existingEmail = strtolower(trim((string) ($existingRecord[$emailIndex] ?? '')));
            if ($existingEmail !== '' && $existingEmail === (string) $record[1]) {
                flock($handle, LOCK_UN);
                fclose($handle);
                return ['ok' => true, 'path' => $path, 'created' => false];
            }
        }
    }

    fseek($handle, 0, SEEK_END);
    fputcsv($handle, $record);
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    @chmod($path, 0640);

    return ['ok' => true, 'path' => $path, 'created' => true];
}

function newsletter_header(): array
{
    return [
        'created_at',
        'email',
        'language',
        'page',
        'consent_version',
        'ip_address',
        'user_agent',
        'referer',
        'accept_language',
    ];
}

function newsletter_risk_signals(array $input): array
{
    $signals = [];
    $score = 0;

    if (trim((string) ($input['company_url'] ?? '')) !== '') {
        $signals[] = 'honeypot_filled';
        $score += 4;
    }

    $startedAt = trim((string) ($input['form_started_at'] ?? ''));
    if ($startedAt === '' || preg_match('/^\d+$/D', $startedAt) !== 1) {
        $signals[] = 'timing_missing';
        $score += 1;
    } else {
        $elapsedMilliseconds = (int) floor(microtime(true) * 1000) - (int) $startedAt;
        if ($elapsedMilliseconds < 0) {
            $signals[] = 'timing_invalid';
            $score += 1;
        } elseif ($elapsedMilliseconds < 900) {
            $signals[] = 'timing_too_fast';
            $score += 2;
        }
    }

    foreach (['language', 'page', 'consent_version'] as $contextField) {
        if (trim((string) ($input[$contextField] ?? '')) === '') {
            $signals[] = 'context_missing';
            $score += 2;
            break;
        }
    }

    return [
        'score' => $score,
        'signals' => array_values(array_unique($signals)),
    ];
}

function append_risk_event(array $config, array $risk, string $outcome): void
{
    $path = (string) ($config['risk_log_path'] ?? '');
    if ($path === '') {
        return;
    }

    $directory = dirname($path);
    if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
        error_log('Newsletter endpoint cannot create risk log directory.');
        return;
    }

    $handle = @fopen($path, 'c+b');
    if ($handle === false) {
        error_log('Newsletter endpoint cannot open submission-risk.csv.');
        return;
    }

    if (!flock($handle, LOCK_EX)) {
        fclose($handle);
        error_log('Newsletter endpoint cannot lock submission-risk.csv.');
        return;
    }

    $stats = fstat($handle);
    if (!is_array($stats) || (int) ($stats['size'] ?? 0) === 0) {
        fputcsv($handle, ['created_at', 'request_id', 'risk_score', 'risk_signals', 'outcome']);
    }

    fseek($handle, 0, SEEK_END);
    try {
        $requestId = bin2hex(random_bytes(8));
    } catch (Throwable $error) {
        error_log('Newsletter endpoint cannot generate risk log request ID.');
        flock($handle, LOCK_UN);
        fclose($handle);
        return;
    }

    fputcsv($handle, [
        gmdate('c'),
        $requestId,
        (string) ($risk['score'] ?? 0),
        implode('|', (array) ($risk['signals'] ?? [])),
        clean_token($outcome, 40),
    ]);
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    @chmod($path, 0640);
}

function send_updated_csv(array $config, string $csvPath, string $email): bool
{
    if (!is_file($csvPath)) {
        return false;
    }

    $csv = (string) file_get_contents($csvPath);
    $boundary = 'lc-newsletter-' . bin2hex(random_bytes(12));
    $to = (string) $config['notification_to'];
    $from = (string) $config['notification_from'];
    $siteName = (string) $config['site_name'];
    $subject = 'Nouvelle inscription newsletter - ' . $siteName;

    $body = [
        '--' . $boundary,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        'Une nouvelle adresse e-mail a été enregistrée : ' . $email,
        '',
        'Le fichier complet newsletter-data/subscriptions.csv est joint à cet e-mail.',
        '',
        '--' . $boundary,
        'Content-Type: text/csv; charset=UTF-8; name="subscriptions.csv"',
        'Content-Disposition: attachment; filename="subscriptions.csv"',
        'Content-Transfer-Encoding: base64',
        '',
        chunk_split(base64_encode($csv)),
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

function clean_field(string $value): string
{
    $value = preg_replace('/[\r\n\t]+/', ' ', $value) ?? '';
    $value = preg_replace('/\s+/', ' ', $value) ?? '';
    return substr(trim($value), 0, 800);
}

function clean_token(string $value, int $maxLength): string
{
    $value = strtolower(trim($value));
    return substr((string) preg_replace('/[^a-z0-9_-]+/', '', $value), 0, $maxLength);
}

function json_response(int $code, array $payload): void
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
