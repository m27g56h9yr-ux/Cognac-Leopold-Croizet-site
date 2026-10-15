<?php
declare(strict_types=1);

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
    $attachmentFilename = newsletter_attachment_filename();
    $to = (string) $config['notification_to'];
    $from = (string) $config['notification_from'];
    $siteName = (string) $config['site_name'];
    $subject = 'Nouvelle inscription newsletter - ' . $siteName;

    $body = [
        '--' . $boundary,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        'Une inscription a été enregistrée sur le site Cognac Léopold Croizet.',
        '',
        'Le fichier complet newsletter-data/subscriptions.csv est joint sous le nom : ' . $attachmentFilename,
        '',
        '--' . $boundary,
        'Content-Type: text/csv; charset=UTF-8; name="' . $attachmentFilename . '"',
        'Content-Disposition: attachment; filename="' . $attachmentFilename . '"',
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

function newsletter_attachment_filename(): string
{
    return 'cognac-leopold-croizet-newsletter-inscriptions-'
        . gmdate('Ymd-His')
        . '-utc.csv';
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

/** Same protected CSV for the historical newsletter and Se retrouver. */
function newsletter_header(): array
{
    return ['created_at', 'email', 'language', 'page', 'consent_version', 'ip_address',
        'user_agent', 'referer', 'accept_language', 'phone', 'consent_email', 'consent_sms',
        'email_page', 'phone_page', 'last_page', 'updated_at', 'email_consented_at', 'phone_consented_at',
        'email_consent_version', 'phone_consent_version', 'email_consent_text', 'phone_consent_text',
        'record_version'];
}

function newsletter_page(string $value): string
{
    $parts = parse_url($value);
    if ($parts === false || (isset($parts['host']) && !in_array(strtolower($parts['host']),
        ['cognac-leopold-croizet.com', 'www.cognac-leopold-croizet.com'], true))) return '';
    $path = $parts['path'] ?? '/';
    return strpos($path, '/') === 0 ? clean_field($path) : '';
}

function newsletter_context(string $page, string $language, string $version): array
{
    return ['created_at' => gmdate('c'), 'language' => clean_field($language),
        'page' => newsletter_page($page), 'consent_version' => clean_field($version),
        'ip_address' => clean_field((string) ($_SERVER['REMOTE_ADDR'] ?? '')),
        'user_agent' => clean_field((string) ($_SERVER['HTTP_USER_AGENT'] ?? '')),
        'referer' => newsletter_page((string) ($_SERVER['HTTP_REFERER'] ?? '')),
        'accept_language' => clean_field((string) ($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? ''))];
}

function newsletter_lock(array $config)
{
    $dir = dirname($config['storage_path']);
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) throw new RuntimeException('Newsletter directory unavailable');
    if (is_link($config['storage_path']) || is_link($config['storage_path'] . '.lock')) throw new RuntimeException('Unsafe newsletter link');
    $lock = fopen($config['storage_path'] . '.lock', 'c+b');
    if (!$lock || !flock($lock, LOCK_EX)) throw new RuntimeException('Newsletter lock unavailable');
    chmod($config['storage_path'] . '.lock', 0600);
    return $lock;
}

/** Caller holds the stable sidecar lock, also used during atomic replacements. */
function newsletter_read(array $config): array
{
    $header = newsletter_header();
    $rows = [];
    if (!is_file($config['storage_path'])) return [$header, $rows];
    $file = fopen($config['storage_path'], 'rb');
    if (!$file) throw new RuntimeException('Newsletter read unavailable');
    try {
        $oldHeader = fgetcsv($file, 0, ',', '"', '');
        if ($oldHeader === false && filesize($config['storage_path']) === 0) return [$header, $rows];
        if (!is_array($oldHeader)) throw new RuntimeException('Invalid newsletter header');
        $oldHeader[0] = ltrim($oldHeader[0], "\xEF\xBB\xBF");
        if (!in_array('email', $oldHeader, true) || count(array_unique($oldHeader)) !== count($oldHeader)) {
            throw new RuntimeException('Unrecognized newsletter header');
        }
        $header = array_values(array_unique(array_merge($oldHeader, $header)));
        // The original writer used PHP's default backslash escape.
        $escape = in_array('record_version', $oldHeader, true) ? '' : '\\';
        while (($cells = fgetcsv($file, 0, ',', '"', $escape)) !== false) {
            if ($cells === [null]) continue;
            if (count($cells) !== count($oldHeader)) throw new RuntimeException('Invalid newsletter row');
            $row = array_combine($oldHeader, $cells);
            if (($row['record_version'] ?? '') === '2') {
                foreach ($row as &$cell) if (preg_match('/^\'[=+@\-\t\r\']/u', (string) $cell)) $cell = substr($cell, 1);
                unset($cell);
            } else {
                // Existing email-only signups retain their original date, page and proof.
                $row['consent_email'] = empty($row['email']) ? '' : 'yes';
                $row['consent_sms'] = '';
                $row['email_page'] = $row['page'] ?? '';
                $row['email_consented_at'] = $row['created_at'] ?? '';
                $row['email_consent_version'] = $row['consent_version'] ?? '';
            }
            $rows[] = $row;
        }
        if (!feof($file)) throw new RuntimeException('Newsletter read incomplete');
    } finally { fclose($file); }
    return [$header, $rows];
}

function newsletter_write(array $config, array $header, array $rows): void
{
    $path = $config['storage_path'];
    $temp = tempnam(dirname($path), '.subscriptions-');
    if ($temp === false) throw new RuntimeException('Newsletter temporary file unavailable');
    $file = fopen($temp, 'wb');
    try {
        if (!$file || !chmod($temp, 0600)) throw new RuntimeException('Newsletter write unavailable');
        if (fputcsv($file, $header, ',', '"', '') === false) throw new RuntimeException('Newsletter write failed');
        foreach ($rows as $row) {
            $row['record_version'] = '2';
            $cells = array_map(static function ($key) use ($row) {
                $value = (string) ($row[$key] ?? '');
                // Safe to open the attached CSV in a spreadsheet, including +33 numbers.
                return preg_match('/^[=+@\-\t\r\']/u', $value) ? "'" . $value : $value;
            }, $header);
            if (fputcsv($file, $cells, ',', '"', '') === false) throw new RuntimeException('Newsletter write failed');
        }
        if (!fflush($file) || (function_exists('fsync') && !fsync($file))) throw new RuntimeException('Newsletter flush failed');
        fclose($file); $file = null;
        if (!rename($temp, $path)) throw new RuntimeException('Newsletter replace failed');
    } finally {
        if (is_resource($file)) fclose($file);
        if (is_file($temp)) unlink($temp);
    }
}

function newsletter_apply(array $store, array &$rows, array $operation): bool
{
    if ($operation['action'] === 'remove') {
        foreach ($rows as &$row) {
            foreach (['email' => 'email', 'sms' => 'phone'] as $channel => $field) {
                $value = strtolower(trim((string) ($row[$field] ?? '')));
                if ($value === '' || !in_array(salon_id($store, $channel, $value), $operation['ids'], true)) continue;
                $row[$field] = '';
                $row[$channel === 'sms' ? 'consent_sms' : 'consent_email'] = '';
                foreach (['_page', '_consented_at', '_consent_version', '_consent_text'] as $suffix) $row[$field . $suffix] = '';
            }
        }
        unset($row);
        $rows = array_values(array_filter($rows, static fn ($r) => !empty($r['email']) || !empty($r['phone'])));
        return false; // Withdrawal never triggers a newsletter notification.
    }
    $selected = $operation['selected'];
    $context = $operation['context'];
    // Historical footer duplicates do not create another row or another email.
    if (!empty($operation['newsletter'])) {
        foreach ($rows as $row) if (strtolower(trim($row['email'] ?? '')) === ($selected['email'] ?? null)) return false;
    }
    $targets = [];
    foreach ($selected as $channel => $value) {
        $field = $channel === 'sms' ? 'phone' : 'email';
        foreach ($rows as $i => $row) {
            if (strtolower(trim((string) ($row[$field] ?? ''))) === $value) $targets[$channel][] = $i;
        }
    }
    foreach ($selected as $channel => $value) {
        $field = $channel === 'sms' ? 'phone' : 'email';
        if (empty($targets[$channel])) {
            // Pair fields submitted together when this does not overwrite another coordinate.
            $target = null;
            foreach ($targets as $indexes) foreach ($indexes as $i) {
                if (empty($rows[$i][$field]) || $rows[$i][$field] === $value) { $target = $i; break 2; }
            }
            if ($target === null) { $target = count($rows); $rows[] = $context; }
            $targets[$channel] = [$target];
        }
        foreach ($targets[$channel] as $i) {
            $rows[$i][$field] = $value;
            $rows[$i][$channel === 'sms' ? 'consent_sms' : 'consent_email'] = 'yes';
            $rows[$i][$field . '_page'] = $context['page'];
            $rows[$i][$field . '_consented_at'] = $context['created_at'];
            $rows[$i][$field . '_consent_version'] = $context['consent_version'];
            $rows[$i][$field . '_consent_text'] = $operation['texts'][$channel] ?? '';
            $rows[$i]['last_page'] = $context['page'];
            $rows[$i]['updated_at'] = $context['created_at'];
            foreach (['ip_address', 'user_agent', 'referer', 'accept_language'] as $key) {
                if (isset($context[$key])) $rows[$i][$key] = $context[$key];
            }
        }
    }
    return !empty($operation['notify']);
}
