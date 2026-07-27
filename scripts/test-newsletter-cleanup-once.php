<?php
declare(strict_types=1);

define('LC_NEWSLETTER_CLEANUP_LIBRARY_ONLY', true);
require __DIR__ . '/newsletter-cleanup-once.php';

function test_row(string $createdAt, string $email, array $overrides = []): array
{
    return array_merge([
        'created_at' => $createdAt,
        'email' => $email,
        'language' => 'en',
        'page' => 'https://cognac-leopold-croizet.com/en/',
        'consent_version' => 'newsletter-news-2026-06-11',
        'ip_address' => '192.0.2.10',
        'user_agent' => '"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"',
        'referer' => 'https://cognac-leopold-croizet.com/en/',
        'accept_language' => 'en-US,en;q=0.9',
    ], $overrides);
}

function assert_true(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

$temporaryDirectory = sys_get_temp_dir() . '/lc-newsletter-cleanup-' . bin2hex(random_bytes(6));
if (!mkdir($temporaryDirectory, 0700, true) && !is_dir($temporaryDirectory)) {
    throw new RuntimeException('test_directory_error');
}
$storagePath = $temporaryDirectory . '/subscriptions.csv';

$rows = [];
for ($index = 0; $index < 7; $index++) {
    $rows[] = test_row(
        sprintf('2026-07-%02dT01:00:00+00:00', $index + 1),
        sprintf('a.%d.b.c.d.e@gmail.com', $index)
    );
}
$rows[] = test_row(
    '2026-07-27T10:19:02+00:00',
    'newsletter-validation-test@cognac-leopold-croizet.com',
    [
        'language' => 'fr',
        'page' => 'https://cognac-leopold-croizet.com/',
        'ip_address' => '2001:db8::1',
        'user_agent' => 'curl/8.7.1',
        'referer' => '',
        'accept_language' => '',
    ]
);
$legitimateRow = test_row(
    '2026-07-27T12:00:00+00:00',
    'client@example.com',
    [
        'language' => 'fr',
        'page' => 'https://cognac-leopold-croizet.com/',
        'user_agent' => 'Mozilla/5.0 Safari/605.1.15',
        'referer' => 'https://cognac-leopold-croizet.com/',
        'accept_language' => 'fr-FR,fr;q=0.9',
    ]
);
$rows[] = $legitimateRow;

$spamHashes = array_map('lc_row_hash', array_slice($rows, 0, 7));
$testHashes = [lc_row_hash($rows[7])];
$originalCsv = lc_encode_newsletter_csv($rows);
file_put_contents($storagePath, $originalCsv);
$result = lc_cleanup_newsletter_storage($storagePath, $spamHashes, $testHashes);
assert_true(($result['status'] ?? '') === 'cleaned', 'cleanup_status');
assert_true(($result['spam_removed'] ?? 0) === 7, 'spam_count');
assert_true(($result['test_removed'] ?? 0) === 1, 'test_count');
assert_true(($result['kept_rows'] ?? 0) === 1, 'kept_count');

$cleanedRows = lc_parse_newsletter_csv((string) file_get_contents($storagePath));
assert_true($cleanedRows === [$legitimateRow], 'legitimate_row_preservation');

$backupPath = $temporaryDirectory . '/backups/' . LC_NEWSLETTER_CLEANUP_BACKUP;
$markerPath = $temporaryDirectory . '/backups/' . LC_NEWSLETTER_CLEANUP_MARKER;
assert_true(is_file($backupPath), 'backup_missing');
assert_true(is_file($markerPath), 'marker_missing');
assert_true((string) file_get_contents($backupPath) === $originalCsv, 'backup_exact_copy');
assert_true(count(lc_parse_newsletter_csv((string) file_get_contents($backupPath))) === 9, 'backup_rows');

unlink($markerPath);
$recoveredResult = lc_cleanup_newsletter_storage($storagePath, $spamHashes, $testHashes);
assert_true(($recoveredResult['status'] ?? '') === 'recovered_done', 'marker_recovery');
$secondResult = lc_cleanup_newsletter_storage($storagePath, $spamHashes, $testHashes);
assert_true(($secondResult['status'] ?? '') === 'already_done', 'idempotence');

$preparedDirectory = sys_get_temp_dir() . '/lc-newsletter-prepared-' . bin2hex(random_bytes(6));
mkdir($preparedDirectory . '/backups', 0700, true);
$preparedStorage = $preparedDirectory . '/subscriptions.csv';
file_put_contents($preparedStorage, lc_encode_newsletter_csv($rows));
file_put_contents(
    $preparedDirectory . '/backups/' . LC_NEWSLETTER_CLEANUP_BACKUP,
    lc_encode_newsletter_csv($rows)
);
$preparedResult = lc_cleanup_newsletter_storage(
    $preparedStorage,
    $spamHashes,
    $testHashes
);
assert_true(
    ($preparedResult['status'] ?? '') === 'cleaned_after_recovery',
    'prepared_backup_recovery'
);
assert_true(
    lc_parse_newsletter_csv((string) file_get_contents($preparedStorage)) === [$legitimateRow],
    'prepared_backup_preservation'
);

echo "newsletter cleanup test ok\n";
