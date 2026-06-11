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
$token = (string) ($config['github_token'] ?? '');

if ($token === '') {
    error_log('Newsletter endpoint is missing LC_NEWSLETTER_GITHUB_TOKEN.');
    json_response(503, ['ok' => false, 'status' => 'unconfigured']);
}

$input = request_data();
$email = strtolower(trim((string) ($input['email'] ?? $input['newsletter'] ?? '')));

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(422, ['ok' => false, 'status' => 'invalid']);
}

$record = [
    gmdate('c'),
    $email,
    clean_field((string) ($input['language'] ?? '')),
    clean_field((string) ($input['page'] ?? '')),
    clean_field((string) ($input['consent_version'] ?? 'newsletter-monthly-news-2026-06-10')),
    privacy_hash((string) ($_SERVER['REMOTE_ADDR'] ?? ''), $config),
    privacy_hash((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), $config),
];

$result = append_newsletter_record($config, $token, $record);
json_response($result['code'], $result['body']);

function newsletter_config(): array
{
    $config = [
        'github_owner' => getenv('LC_NEWSLETTER_GITHUB_OWNER') ?: 'm27g56h9yr-ux',
        'github_repo' => getenv('LC_NEWSLETTER_GITHUB_REPO') ?: 'maison-des-pierres',
        'github_branch' => getenv('LC_NEWSLETTER_GITHUB_BRANCH') ?: 'main',
        'github_path' => getenv('LC_NEWSLETTER_GITHUB_PATH') ?: 'newsletter/subscribers.csv',
        'github_token' => getenv('LC_NEWSLETTER_GITHUB_TOKEN') ?: '',
        'hash_secret' => getenv('LC_NEWSLETTER_HASH_SECRET') ?: '',
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

function append_newsletter_record(array $config, string $token, array $record): array
{
    $owner = rawurlencode((string) $config['github_owner']);
    $repo = rawurlencode((string) $config['github_repo']);
    $branch = (string) $config['github_branch'];
    $path = ltrim((string) $config['github_path'], '/');
    $encodedPath = implode('/', array_map('rawurlencode', explode('/', $path)));
    $baseUrl = "https://api.github.com/repos/{$owner}/{$repo}/contents/{$encodedPath}";
    $header = "created_at,email,language,page,consent_version,ip_hash,user_agent_hash\n";

    for ($attempt = 0; $attempt < 2; $attempt++) {
        $current = github_request('GET', $baseUrl . '?ref=' . rawurlencode($branch), $token);

        if ($current['status'] === 404) {
            $content = $header;
            $sha = null;
        } elseif ($current['status'] >= 200 && $current['status'] < 300) {
            $content = base64_decode((string) str_replace(["\n", "\r"], '', $current['json']['content'] ?? ''), true);
            if ($content === false) {
                error_log('Newsletter endpoint could not decode GitHub file content.');
                return ['code' => 502, 'body' => ['ok' => false, 'status' => 'github_decode_error']];
            }
            $sha = (string) ($current['json']['sha'] ?? '');
        } else {
            error_log('Newsletter endpoint GitHub GET failed with HTTP ' . $current['status']);
            return ['code' => 502, 'body' => ['ok' => false, 'status' => 'github_read_error']];
        }

        if (email_exists_in_csv($content, $record[1])) {
            return ['code' => 200, 'body' => ['ok' => true, 'status' => 'duplicate']];
        }

        $payload = [
            'message' => 'Add newsletter subscriber',
            'content' => base64_encode(rtrim($content, "\r\n") . "\n" . csv_line($record)),
            'branch' => $branch,
        ];
        if ($sha) {
            $payload['sha'] = $sha;
        }

        $put = github_request('PUT', $baseUrl, $token, $payload);
        if ($put['status'] >= 200 && $put['status'] < 300) {
            return ['code' => 200, 'body' => ['ok' => true, 'status' => 'saved']];
        }

        if ($put['status'] === 409 && $attempt === 0) {
            continue;
        }

        error_log('Newsletter endpoint GitHub PUT failed with HTTP ' . $put['status']);
        return ['code' => 502, 'body' => ['ok' => false, 'status' => 'github_write_error']];
    }

    return ['code' => 409, 'body' => ['ok' => false, 'status' => 'conflict']];
}

function github_request(string $method, string $url, string $token, ?array $payload = null): array
{
    $headers = [
        'Accept: application/vnd.github+json',
        'Authorization: Bearer ' . $token,
        'Content-Type: application/json',
        'User-Agent: Cognac-Leopold-Croizet-newsletter',
        'X-GitHub-Api-Version: 2022-11-28',
    ];

    $options = [
        'http' => [
            'method' => $method,
            'header' => implode("\r\n", $headers),
            'ignore_errors' => true,
            'timeout' => 12,
        ],
    ];

    if ($payload !== null) {
        $options['http']['content'] = json_encode($payload, JSON_UNESCAPED_SLASHES);
    }

    $body = @file_get_contents($url, false, stream_context_create($options));
    $status = 0;
    foreach (($http_response_header ?? []) as $header) {
        if (preg_match('/^HTTP\/\S+\s+(\d+)/', $header, $match)) {
            $status = (int) $match[1];
            break;
        }
    }

    $json = is_string($body) && $body !== '' ? json_decode($body, true) : null;
    return [
        'status' => $status,
        'body' => $body,
        'json' => is_array($json) ? $json : [],
    ];
}

function email_exists_in_csv(string $csv, string $email): bool
{
    $lines = preg_split('/\R/', trim($csv));
    if (!is_array($lines)) {
        return false;
    }

    foreach ($lines as $index => $line) {
        if ($index === 0 || trim($line) === '') {
            continue;
        }
        $fields = str_getcsv($line);
        if (isset($fields[1]) && strtolower(trim($fields[1])) === $email) {
            return true;
        }
    }

    return false;
}

function csv_line(array $fields): string
{
    $handle = fopen('php://temp', 'r+');
    fputcsv($handle, $fields);
    rewind($handle);
    return (string) stream_get_contents($handle);
}

function clean_field(string $value): string
{
    return substr(trim(preg_replace('/\s+/', ' ', $value) ?? ''), 0, 300);
}

function privacy_hash(string $value, array $config): string
{
    if ($value === '') {
        return '';
    }
    $secret = (string) ($config['hash_secret'] ?: $config['github_token'] ?? 'newsletter');
    return hash_hmac('sha256', $value, $secret);
}

function json_response(int $code, array $payload): void
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
