<?php
declare(strict_types=1);

/** Card-level counters only. No visitor profile or cross-page identifier. */
function nfc_card_id($value): string
{
    if (!is_string($value) || !preg_match('/^LC([0-9]{1,4})$/Di', trim($value), $match)) return '';
    $number = (int) $match[1];
    return $number > 0 ? 'LC' . str_pad((string) $number, 2, '0', STR_PAD_LEFT) : '';
}

function nfc_schema(PDO $db): void
{
    $db->exec('CREATE TABLE IF NOT EXISTS nfc_daily (
        day TEXT NOT NULL, card_id TEXT NOT NULL, event TEXT NOT NULL, hits INTEGER NOT NULL,
        PRIMARY KEY(day, card_id, event)
    );
    CREATE TABLE IF NOT EXISTS nfc_receipts (id TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS nfc_receipts_expiry ON nfc_receipts(expires_at);');
}

function nfc_cleanup(PDO $db): void
{
    $q = $db->prepare('DELETE FROM nfc_daily WHERE day < ?');
    $q->execute([gmdate('Y-m-d', strtotime('-25 months'))]);
    $q = $db->prepare('DELETE FROM nfc_receipts WHERE expires_at < ?');
    $q->execute([time()]);
}

function nfc_measure_allowed(): bool
{
    return ($_SERVER['HTTP_DNT'] ?? '') !== '1' && ($_SERVER['HTTP_SEC_GPC'] ?? '') !== '1';
}

/** Called inside the caller's transaction, including for accepted subscriptions. */
function nfc_increment(array $store, string $card, string $event): void
{
    if ($card === '') return;
    $q = $store['db']->prepare('INSERT INTO nfc_daily VALUES (?, ?, ?, 1)
        ON CONFLICT(day, card_id, event) DO UPDATE SET hits=hits+1');
    $q->execute([gmdate('Y-m-d'), $card, $event]);
}

function nfc_record(array $store, array $input): void
{
    $card = nfc_card_id($input['card_id'] ?? null);
    $event = $input['event'] ?? null;
    $page = $input['page_id'] ?? null;
    if ($card === '' || !in_array($event, ['view', 'instagram', 'facebook'], true)
        || !is_string($page) || !preg_match('/^[a-f0-9]{32}$/D', $page)) {
        throw new SalonError('invalid_event', 422);
    }
    // A random value exists only for this page load. Keep an event-specific
    // keyed receipt for 24 hours to suppress transport retries, never its raw ID.
    $receipt = hash_hmac('sha256', $card . '|' . $event . '|' . $page, salon_key($store, 'nfc-receipt'));
    $db = $store['db'];
    $db->exec('BEGIN IMMEDIATE');
    try {
        $q = $db->prepare('INSERT OR IGNORE INTO nfc_receipts VALUES (?, ?)');
        $q->execute([$receipt, time() + 86400]);
        if ($q->rowCount() === 1) nfc_increment($store, $card, $event);
        $db->exec('COMMIT');
    } catch (Throwable $e) { $db->exec('ROLLBACK'); throw $e; }
}

function nfc_report(array $store, $from = null, $to = null): array
{
    $oldest = gmdate('Y-m-d', strtotime('-25 months'));
    $today = gmdate('Y-m-d');
    $from = $from ?? $oldest;
    $to = $to ?? $today;
    foreach ([$from, $to] as $date) {
        if (!is_string($date) || !preg_match('/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/D', $date, $m)
            || !checkdate((int) $m[2], (int) $m[3], (int) $m[1])) throw new SalonError('invalid_period', 422);
    }
    if ($from > $to || $from < $oldest || $to > $today) throw new SalonError('invalid_period', 422);
    $cards = [];
    $empty = static fn ($id) => ['card_id' => $id, 'url' => LC_SALON_ORIGIN . '/se-retrouver/?carte=' . $id,
        'views' => 0, 'instagram_clicks' => 0, 'facebook_clicks' => 0,
        'subscriptions' => 0, 'email_consents' => 0, 'sms_consents' => 0];
    for ($i = 1; $i <= 10; $i++) { $id = nfc_card_id('LC' . $i); $cards[$id] = $empty($id); }
    $columns = ['view' => 'views', 'instagram' => 'instagram_clicks', 'facebook' => 'facebook_clicks',
        'subscribe' => 'subscriptions', 'email' => 'email_consents', 'sms' => 'sms_consents'];
    $q = $store['db']->prepare('SELECT card_id, event, SUM(hits) AS total FROM nfc_daily
        WHERE day BETWEEN ? AND ? GROUP BY card_id, event');
    $q->execute([$from, $to]);
    foreach ($q->fetchAll() as $row) {
        $id = $row['card_id'];
        if (!isset($columns[$row['event']])) continue;
        $cards[$id] = $cards[$id] ?? $empty($id);
        $cards[$id][$columns[$row['event']]] = (int) $row['total'];
    }
    uksort($cards, 'strnatcmp');
    return ['ok' => true, 'from' => $from, 'to' => $to, 'timezone' => 'UTC',
        'retention_months' => 25, 'cards' => array_values($cards),
        'note' => 'Ouvertures des liens, pas visiteurs uniques ni lectures physiques de puces. Les clics ne prouvent pas un abonnement social. Une inscription validée peut renouveler un accord existant.'];
}

function nfc_report_csv(array $report): string
{
    $file = fopen('php://temp', 'w+b');
    if (!$file) throw new RuntimeException('Card report unavailable');
    try {
        fputcsv($file, ['carte', 'url', 'du_utc', 'au_utc', 'ouvertures', 'clics_instagram', 'clics_facebook',
            'inscriptions_validees', 'accords_email', 'accords_sms'], ',', '"', '');
        foreach ($report['cards'] as $row) {
            fputcsv($file, [$row['card_id'], $row['url'], $report['from'], $report['to'], $row['views'],
                $row['instagram_clicks'], $row['facebook_clicks'], $row['subscriptions'],
                $row['email_consents'], $row['sms_consents']], ',', '"', '');
        }
        rewind($file);
        return (string) stream_get_contents($file);
    } finally { fclose($file); }
}
