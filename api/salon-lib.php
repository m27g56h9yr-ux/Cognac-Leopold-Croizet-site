<?php
declare(strict_types=1);

/** Dedicated consent store for Cognac Léopold Croizet. No marketing transport. */
const LC_SALON_BRAND = 'Cognac Léopold Croizet';
const LC_SALON_VERSION = 'salon-contact-2026-10-15-v6';
const LC_SALON_ORIGIN = 'https://cognac-leopold-croizet.com';
const LC_SALON_TEXT = [
    'sms' => 'Je souhaite recevoir par SMS des invitations aux prochains salons et des offres de Cognac Léopold Croizet.',
    'email' => 'Je souhaite recevoir par e-mail des invitations aux prochains salons et des offres de Cognac Léopold Croizet.',
];

final class SalonError extends RuntimeException
{
    public int $httpStatus;
    public function __construct(string $message, int $httpStatus = 422)
    {
        parent::__construct($message);
        $this->httpStatus = $httpStatus;
    }
}

function salon_headers(): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, max-age=0');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: no-referrer');
    header('X-Robots-Tag: noindex, nofollow, noarchive');
}

function salon_response(int $status, array $data): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit;
}

function salon_store(): array
{
    umask(0077); // Includes SQLite journals and the first key write.
    if (!extension_loaded('pdo_sqlite') || !function_exists('openssl_encrypt')) {
        throw new RuntimeException('Required storage/crypto extensions unavailable');
    }
    // On OVH: /home/account/private-lc-salon, outside /home/account/www/site-pc-new.
    $dir = getenv('LC_SALON_PRIVATE_DIR') ?: dirname(__DIR__, 3) . '/private-lc-salon';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        throw new RuntimeException('Private storage unavailable');
    }
    $realDir = realpath($dir);
    $publicRoot = realpath(dirname(__DIR__));
    if ($realDir === false || $publicRoot === false
        || $realDir === $publicRoot || strpos($realDir, $publicRoot . DIRECTORY_SEPARATOR) === 0
        || is_link($dir)) {
        throw new RuntimeException('Storage must be outside the public root');
    }
    if (!@chmod($realDir, 0700) || (fileperms($realDir) & 0077) !== 0) {
        throw new RuntimeException('Private directory permissions unavailable');
    }
    $setup = fopen($realDir . '/setup.lock', 'c+b');
    if ($setup === false || !flock($setup, LOCK_EX)) {
        throw new RuntimeException('Storage setup lock unavailable');
    }
    @chmod($realDir . '/setup.lock', 0600);
    try {
        $keyFile = $realDir . '/master.key';
        $dbFile = $realDir . '/consents.sqlite';
        if (is_link($keyFile) || is_link($dbFile)) {
            throw new RuntimeException('Unsafe storage link');
        }
        if (!is_file($keyFile)) {
            // Never silently replace a lost encryption key for an existing database.
            if (is_file($dbFile)) throw new RuntimeException('Encryption key missing');
            $keyHandle = fopen($keyFile, 'xb');
            if ($keyHandle === false) throw new RuntimeException('Key creation failed');
            try {
                if (fwrite($keyHandle, random_bytes(32)) !== 32 || !fflush($keyHandle)) {
                    throw new RuntimeException('Key write failed');
                }
            } finally {
                fclose($keyHandle);
            }
        }
        @chmod($keyFile, 0600);
        $key = file_get_contents($keyFile);
        if (!is_string($key) || strlen($key) !== 32 || (fileperms($keyFile) & 0077) !== 0) {
            throw new RuntimeException('Encryption key invalid');
        }
        $db = new PDO('sqlite:' . $dbFile, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        @chmod($dbFile, 0600);
        if ((fileperms($dbFile) & 0077) !== 0) throw new RuntimeException('Database permissions invalid');
        $db->exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=DELETE; PRAGMA secure_delete=ON;');
        $db->exec('CREATE TABLE IF NOT EXISTS contacts (
            id TEXT PRIMARY KEY, channel TEXT NOT NULL, state TEXT NOT NULL,
            cipher TEXT NOT NULL, created_at TEXT NOT NULL, changed_at TEXT NOT NULL,
            expires_at TEXT NOT NULL, ownership TEXT NOT NULL DEFAULT "declared"
        );
        CREATE TABLE IF NOT EXISTS consent_events (
            event_id TEXT PRIMARY KEY, contact_id TEXT NOT NULL,
            cipher TEXT NOT NULL, expires_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS limits (bucket TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires_at INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS nonces (id TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
        CREATE INDEX IF NOT EXISTS contacts_expiry ON contacts(expires_at);
        CREATE INDEX IF NOT EXISTS events_expiry ON consent_events(expires_at);');
    } finally {
        flock($setup, LOCK_UN);
        fclose($setup);
    }
    return ['db' => $db, 'key' => $key];
}

function salon_key(array $store, string $purpose): string
{
    return hash_hmac('sha256', 'lc-salon/' . $purpose, $store['key'], true);
}

function salon_encrypt(array $store, array $data): string
{
    $nonce = random_bytes(12);
    $tag = '';
    $cipher = openssl_encrypt(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
        'aes-256-gcm', salon_key($store, 'encryption'), OPENSSL_RAW_DATA, $nonce, $tag, LC_SALON_BRAND, 16);
    if ($cipher === false) throw new RuntimeException('Encryption failed');
    return base64_encode($nonce . $tag . $cipher);
}

function salon_decrypt(array $store, string $payload): array
{
    $raw = base64_decode($payload, true);
    if ($raw === false || strlen($raw) < 29) throw new RuntimeException('Invalid encrypted record');
    $plain = openssl_decrypt(substr($raw, 28), 'aes-256-gcm', salon_key($store, 'encryption'),
        OPENSSL_RAW_DATA, substr($raw, 0, 12), substr($raw, 12, 16), LC_SALON_BRAND);
    if ($plain === false) throw new RuntimeException('Record authentication failed');
    return json_decode($plain, true, 16, JSON_THROW_ON_ERROR);
}

function salon_b64(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function salon_sign(array $store, string $purpose, array $claims): string
{
    $payload = salon_b64(json_encode($claims, JSON_THROW_ON_ERROR));
    return $payload . '.' . salon_b64(hash_hmac('sha256', $payload, salon_key($store, $purpose), true));
}

function salon_claims(array $store, string $purpose, string $token): array
{
    if (strlen($token) > 1600 || substr_count($token, '.') !== 1) throw new SalonError('invalid_token', 400);
    [$payload, $signature] = explode('.', $token, 2);
    $expected = salon_b64(hash_hmac('sha256', $payload, salon_key($store, $purpose), true));
    if (!hash_equals($expected, $signature)) throw new SalonError('invalid_token', 400);
    $decoded = base64_decode(strtr($payload, '-_', '+/'), true);
    $claims = $decoded === false ? null : json_decode($decoded, true, 8);
    if (!is_array($claims)) throw new SalonError('invalid_token', 400);
    return $claims;
}

function salon_guard_origin(): void
{
    $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    $local = getenv('LC_SALON_TEST_MODE') === '1';
    $allowed = $origin === LC_SALON_ORIGIN || ($local && preg_match('~^http://(?:127\.0\.0\.1|localhost):[0-9]+$~D', $origin));
    if (!$allowed || in_array((string) ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? ''), ['cross-site', 'same-site'], true)) {
        throw new SalonError('origin_denied', 403);
    }
}

function salon_input(): array
{
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 8192) throw new SalonError('request_too_large', 413);
    if (stripos((string) ($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json') === false) {
        throw new SalonError('json_required', 415);
    }
    $raw = file_get_contents('php://input', false, null, 0, 8193);
    if ($raw === false || strlen($raw) > 8192) throw new SalonError('request_too_large', 413);
    $input = json_decode($raw, true);
    if (!is_array($input)) throw new SalonError('invalid_json', 400);
    return $input;
}

function salon_limit(array $store, string $operation, int $maxHits): void
{
    $window = intdiv(time(), 900);
    $remote = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    // No raw IP is retained. The keyed fingerprint changes every 15 minutes.
    $bucket = hash_hmac('sha256', $operation . '|' . $window . '|' . $remote, salon_key($store, 'rate'));
    $q = $store['db']->prepare('INSERT INTO limits VALUES (?, 1, ?)
        ON CONFLICT(bucket) DO UPDATE SET hits=hits+1');
    $q->execute([$bucket, ($window + 2) * 900]);
    $q = $store['db']->prepare('SELECT hits FROM limits WHERE bucket=?');
    $q->execute([$bucket]);
    if ((int) $q->fetchColumn() > $maxHits) throw new SalonError('rate_limited', 429);
}

function salon_cleanup(array $store): void
{
    $now = gmdate('c');
    $db = $store['db'];
    $q = $db->prepare('UPDATE contacts SET state="expired", cipher="", changed_at=?,
        expires_at=? WHERE state="active" AND expires_at < ?');
    $q->execute([$now, gmdate('c', strtotime('+3 years')), $now]);
    $q = $db->prepare('DELETE FROM contacts WHERE state != "active" AND expires_at < ?');
    $q->execute([$now]);
    $q = $db->prepare('DELETE FROM consent_events WHERE expires_at < ?');
    $q->execute([$now]);
    $db->exec('DELETE FROM limits WHERE expires_at < ' . time());
    $db->exec('DELETE FROM nonces WHERE expires_at < ' . time());
}

function salon_challenge(array $store): string
{
    return salon_sign($store, 'challenge', ['nonce' => bin2hex(random_bytes(16)), 'issued' => time()]);
}

function salon_consume(array $store, string $token): void
{
    $claims = salon_claims($store, 'challenge', $token);
    $issued = $claims['issued'] ?? 0;
    $nonce = $claims['nonce'] ?? '';
    if (!is_int($issued) || $issued > time() + 10 || $issued < time() - 3600
        || !is_string($nonce) || preg_match('/^[a-f0-9]{32}$/D', $nonce) !== 1) {
        throw new SalonError('expired_challenge', 403);
    }
    $q = $store['db']->prepare('INSERT OR IGNORE INTO nonces VALUES (?, ?)');
    $q->execute([$nonce, $issued + 3600]);
    if ($q->rowCount() !== 1) throw new SalonError('challenge_reused', 409);
}

function salon_normalize(string $channel, $value): string
{
    if (!is_string($value) || strlen($value) > 254) throw new SalonError('invalid_' . $channel);
    $value = trim($value);
    if ($channel === 'email') {
        if (!filter_var($value, FILTER_VALIDATE_EMAIL)) throw new SalonError('invalid_email');
        return strtolower($value);
    }
    // Contact cards can contain non-breaking spaces and the optional French (0).
    $value = preg_replace('/\p{Z}+/u', ' ', $value) ?? '';
    $value = preg_replace('/^(\+33|0033)\s*\(0\)/', '$1', $value) ?? '';
    if (preg_match('/^[+0-9().\s-]+$/D', $value) !== 1) throw new SalonError('invalid_sms');
    $value = preg_replace('/[().\s-]/', '', $value) ?? '';
    if (strpos($value, '00') === 0) $value = '+' . substr($value, 2);
    if (preg_match('/^0[67][0-9]{8}$/D', $value)) $value = '+33' . substr($value, 1);
    if (!preg_match('/^\+[1-9][0-9]{6,14}$/D', $value)
        || (strpos($value, '+33') === 0 && !preg_match('/^\+33[67][0-9]{8}$/D', $value))) {
        throw new SalonError('invalid_sms');
    }
    return $value;
}

function salon_id(array $store, string $channel, string $value): string
{
    return hash_hmac('sha256', $channel . "\n" . $value, salon_key($store, 'contact-id'));
}

function salon_event(array $store, string $id, string $channel, string $action, array $extra = []): void
{
    $q = $store['db']->prepare('INSERT INTO consent_events VALUES (?, ?, ?, ?)');
    $q->execute([bin2hex(random_bytes(16)), $id, salon_encrypt($store, array_merge([
        'brand' => LC_SALON_BRAND, 'channel' => $channel, 'action' => $action,
        'at' => gmdate('c'), 'consent_version' => LC_SALON_VERSION,
        'source' => 'salon-nfc-qr', 'page' => '/salon/',
    ], $extra)), gmdate('c', strtotime('+3 years'))]);
}

function salon_subscribe(array $store, array $input): array
{
    if (($input['consent_version'] ?? '') !== LC_SALON_VERSION) throw new SalonError('consent_version_changed', 409);
    $selected = [];
    if (($input['consent_sms'] ?? false) === true) $selected['sms'] = salon_normalize('sms', $input['phone'] ?? '');
    if (($input['consent_email'] ?? false) === true) $selected['email'] = salon_normalize('email', $input['email'] ?? '');
    if (!$selected) throw new SalonError('consent_required');
    $ids = [];
    $now = gmdate('c');
    foreach ($selected as $channel => $value) {
        $id = salon_id($store, $channel, $value);
        $ids[] = $id;
        $record = [
            'brand' => LC_SALON_BRAND, 'channel' => $channel, 'contact' => $value,
            'consented_at' => $now, 'consent_version' => LC_SALON_VERSION,
            'consent_text' => LC_SALON_TEXT[$channel], 'source' => 'salon-nfc-qr',
            'page' => '/salon/',
            'ownership' => 'declared_not_verified',
        ];
        $q = $store['db']->prepare('INSERT INTO contacts VALUES (?, ?, "active", ?, ?, ?, ?, "declared")
            ON CONFLICT(id) DO UPDATE SET state="active", cipher=excluded.cipher,
            changed_at=excluded.changed_at, expires_at=excluded.expires_at, ownership="declared"');
        $q->execute([$id, $channel, salon_encrypt($store, $record), $now, $now, gmdate('c', strtotime('+3 years'))]);
        salon_event($store, $id, $channel, 'consent_granted', [
            'text' => LC_SALON_TEXT[$channel],
            'positive_action' => 'filled_contact_fields_and_subscription_submit',
            'button_text' => 'M’inscrire',
            'channel_choice_text' => 'Par SMS et/ou e-mail, selon les champs remplis.',
            'challenge_hash' => hash('sha256', (string) $input['challenge']),
        ]);
    }
    $token = salon_sign($store, 'manage', ['ids' => $ids]);
    return ['ok' => true, 'status' => 'saved', 'manage_url' => LC_SALON_ORIGIN . '/salon/desinscription/#' . $token];
}

function salon_manage_ids(array $store, string $token): array
{
    $claims = salon_claims($store, 'manage', $token);
    $ids = $claims['ids'] ?? null;
    if (!is_array($ids) || count($ids) < 1 || count($ids) > 2) throw new SalonError('invalid_token', 400);
    foreach ($ids as $id) {
        if (!is_string($id) || preg_match('/^[a-f0-9]{64}$/D', $id) !== 1) throw new SalonError('invalid_token', 400);
    }
    return array_values(array_unique($ids));
}

function salon_inspect(array $store, array $input): array
{
    $ids = salon_manage_ids($store, (string) ($input['token'] ?? ''));
    $rows = [];
    foreach ($ids as $id) {
        $q = $store['db']->prepare('SELECT channel, state FROM contacts WHERE id=?');
        $q->execute([$id]);
        $r = $q->fetch();
        if ($r) $rows[] = $r;
    }
    return ['ok' => true, 'channels' => $rows];
}

function salon_withdraw(array $store, array $input): array
{
    $ids = [];
    $selected = $input['channels'] ?? [];
    if (!is_array($selected) || !$selected || count($selected) > 2
        || count(array_filter($selected, static fn ($v) => is_string($v) && in_array($v, ['sms', 'email'], true))) !== count($selected)) {
        throw new SalonError('channel_required');
    }
    if (!empty($input['token'])) {
        $ids = salon_manage_ids($store, (string) $input['token']);
    } else {
        // A visitor who has lost their link can still oppose processing online.
        // Responses never disclose whether an address/number was registered.
        foreach ($selected as $channel) {
            $value = salon_normalize($channel, $input[$channel === 'sms' ? 'phone' : 'email'] ?? '');
            $ids[] = salon_id($store, $channel, $value);
        }
    }
    foreach ($ids as $id) {
        $q = $store['db']->prepare('SELECT channel FROM contacts WHERE id=?');
        $q->execute([$id]);
        $channel = $q->fetchColumn();
        if (!$channel || !in_array($channel, $selected, true)) continue;
        $q = $store['db']->prepare('UPDATE contacts SET state="withdrawn", cipher="", changed_at=?, expires_at=? WHERE id=?');
        $q->execute([gmdate('c'), gmdate('c', strtotime('+3 years')), $id]);
        salon_event($store, $id, $channel, 'consent_withdrawn', ['method' => empty($input['token']) ? 'contact_opposition' : 'private_link']);
    }
    return ['ok' => true, 'status' => 'withdrawn'];
}

