<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
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

$saveResult = append_local_record($config, $record);
if (!$saveResult['ok']) {
    json_response(500, ['ok' => false, 'status' => $saveResult['status']]);
}

$mailSent = send_updated_csv($config, (string) $saveResult['path'], $email);

json_response(200, [
    'ok' => true,
    'status' => $mailSent ? 'saved_and_emailed' : 'saved_email_failed',
]);

function newsletter_config(): array
{
    $config = [
        'storage_path' => dirname(__DIR__) . '/newsletter-data/subscriptions.csv',
        'notification_to' => 'cognac@mdpierre.com',
        'notification_from' => 'newsletter@cognac-leopold-croizet.com',
        'site_name' => 'Cognac Léopold Croizet',
    ];

    $localConfig = __DIR__ . '/newsletter-config.php';
    if (is_file($localConfig)) {
        $override = require $localConfig;
        if (is_array($override)) {
            $config = array_merge($config, array_filter($override, static fn ($value) => $value !== null && $value !== ''));
        }
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
    $header = [
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

    if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
        error_log('Newsletter endpoint cannot create storage directory.');
        return ['ok' => false, 'status' => 'storage_directory_error'];
    }

    $isNewFile = !is_file($path) || filesize($path) === 0;
    $handle = fopen($path, 'ab');
    if ($handle === false) {
        error_log('Newsletter endpoint cannot open subscriptions.csv.');
        return ['ok' => false, 'status' => 'storage_open_error'];
    }

    if (!flock($handle, LOCK_EX)) {
        fclose($handle);
        error_log('Newsletter endpoint cannot lock subscriptions.csv.');
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

function json_response(int $code, array $payload): void
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
