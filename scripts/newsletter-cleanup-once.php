<?php
declare(strict_types=1);

const LC_NEWSLETTER_CLEANUP_BACKUP = 'subscriptions-pre-antibot-20260727.csv';
const LC_NEWSLETTER_CLEANUP_MARKER = 'cleanup-pre-antibot-20260727.done.json';
const LC_NEWSLETTER_CLEANUP_TOKEN = '.newsletter-cleanup-20260727.token';
const LC_NEWSLETTER_SPAM_ROW_HASHES = [
    '2bef4f582e2ecd8ea5bdccb529a2094bd3e564bf77c9d3639a2a71c0293c3477',
    '39041eedffe2e09773cbf4ec7dbf9c58f0734539ce8c40eea39219589f5c6123',
    '5ddb773a2e352e2b041c23981dd9bd02f6cc2e72c664b84f3f80c8afc1a03941',
    'a556492abeef9d77f856576aa63015e729f87ee49a7464a657820a22ff7fd6b2',
    'b79a47a983e857ffccb8206c7bf4c96290aa2a124ccc0c8de43c7c32564137ca',
    '5ad815ebab2d74746720fe648136bdc046332a673a1071ca32254f7f227661c8',
    '05167016c689dfa9ee18da5aa228bdfbef44af044754ccca6ae691335595ca43',
];
const LC_NEWSLETTER_TEST_ROW_HASHES = [
    '44406e32d3ea32b8e015d3d0a40f818f0e839de61c0767a71e025c7531078301',
];

function lc_newsletter_header(): array
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

function lc_row_hash(array $record): string
{
    $values = [];
    foreach (lc_newsletter_header() as $field) {
        $values[] = (string) ($record[$field] ?? '');
    }

    return hash('sha256', implode("\x1f", $values));
}

function lc_is_reviewed_bot_row(array $record, ?array $targetHashes = null): bool
{
    return in_array(
        lc_row_hash($record),
        $targetHashes ?? LC_NEWSLETTER_SPAM_ROW_HASHES,
        true
    );
}

function lc_is_validation_test_row(array $record, ?array $targetHashes = null): bool
{
    return in_array(
        lc_row_hash($record),
        $targetHashes ?? LC_NEWSLETTER_TEST_ROW_HASHES,
        true
    );
}

function lc_partition_rows(
    array $rows,
    ?array $spamHashes = null,
    ?array $testHashes = null
): array {
    $keptRows = [];
    $spamRemoved = 0;
    $testRemoved = 0;
    foreach ($rows as $record) {
        if (lc_is_reviewed_bot_row($record, $spamHashes)) {
            $spamRemoved++;
            continue;
        }
        if (lc_is_validation_test_row($record, $testHashes)) {
            $testRemoved++;
            continue;
        }
        $keptRows[] = $record;
    }

    return [
        'kept_rows' => $keptRows,
        'spam_removed' => $spamRemoved,
        'test_removed' => $testRemoved,
    ];
}

function lc_rows_start_with(array $rows, array $prefix): bool
{
    if (count($rows) < count($prefix)) {
        return false;
    }

    return array_slice($rows, 0, count($prefix)) === $prefix;
}

function lc_parse_newsletter_csv(string $csv): array
{
    $stream = fopen('php://temp', 'w+b');
    if ($stream === false) {
        throw new RuntimeException('temporary_stream_error');
    }
    if (fwrite($stream, $csv) === false) {
        fclose($stream);
        throw new RuntimeException('temporary_stream_error');
    }
    rewind($stream);

    $header = fgetcsv($stream, 0, ',', '"', '');
    if ($header !== lc_newsletter_header()) {
        fclose($stream);
        throw new RuntimeException('unexpected_header');
    }

    $rows = [];
    while (($row = fgetcsv($stream, 0, ',', '"', '')) !== false) {
        if ($row === [null] || $row === []) {
            continue;
        }
        if (count($row) !== count($header)) {
            fclose($stream);
            throw new RuntimeException('unexpected_row_width');
        }
        $record = array_combine($header, $row);
        if (!is_array($record)) {
            fclose($stream);
            throw new RuntimeException('unexpected_row');
        }
        $rows[] = $record;
    }
    fclose($stream);

    return $rows;
}

function lc_encode_newsletter_csv(array $rows): string
{
    $stream = fopen('php://temp', 'w+b');
    if ($stream === false) {
        throw new RuntimeException('temporary_stream_error');
    }
    if (fputcsv($stream, lc_newsletter_header(), ',', '"', '') === false) {
        fclose($stream);
        throw new RuntimeException('csv_write_error');
    }
    foreach ($rows as $record) {
        $row = [];
        foreach (lc_newsletter_header() as $field) {
            $row[] = (string) ($record[$field] ?? '');
        }
        if (fputcsv($stream, $row, ',', '"', '') === false) {
            fclose($stream);
            throw new RuntimeException('csv_write_error');
        }
    }
    rewind($stream);
    $csv = stream_get_contents($stream);
    fclose($stream);
    if (!is_string($csv)) {
        throw new RuntimeException('csv_write_error');
    }

    return $csv;
}

function lc_write_all($handle, string $contents): void
{
    $length = strlen($contents);
    $offset = 0;
    while ($offset < $length) {
        $written = fwrite($handle, substr($contents, $offset));
        if ($written === false || $written === 0) {
            throw new RuntimeException('storage_write_error');
        }
        $offset += $written;
    }
}

function lc_replace_locked_file($handle, string $newContents, string $originalContents): void
{
    try {
        if (!rewind($handle) || !ftruncate($handle, 0)) {
            throw new RuntimeException('storage_truncate_error');
        }
        lc_write_all($handle, $newContents);
        if (!fflush($handle)) {
            throw new RuntimeException('storage_flush_error');
        }
        if (function_exists('fsync') && !fsync($handle)) {
            throw new RuntimeException('storage_sync_error');
        }
    } catch (Throwable $error) {
        try {
            if (!rewind($handle) || !ftruncate($handle, 0)) {
                throw new RuntimeException('storage_rollback_truncate_error');
            }
            lc_write_all($handle, $originalContents);
            if (!fflush($handle)) {
                throw new RuntimeException('storage_rollback_flush_error');
            }
            if (function_exists('fsync') && !fsync($handle)) {
                throw new RuntimeException('storage_rollback_sync_error');
            }
        } catch (Throwable $rollbackError) {
            throw new RuntimeException(
                'storage_rollback_error',
                0,
                $error
            );
        }
        throw $error;
    }
}

function lc_atomic_write(string $path, string $contents, int $mode): void
{
    $temporaryPath = $path . '.tmp-' . bin2hex(random_bytes(8));
    $written = file_put_contents($temporaryPath, $contents, LOCK_EX);
    if (!is_int($written) || $written !== strlen($contents)) {
        @unlink($temporaryPath);
        throw new RuntimeException('backup_write_error');
    }
    if (!chmod($temporaryPath, $mode)) {
        @unlink($temporaryPath);
        throw new RuntimeException('backup_permissions_error');
    }
    if (!rename($temporaryPath, $path)) {
        @unlink($temporaryPath);
        throw new RuntimeException('backup_rename_error');
    }
}

function lc_complete_marker(
    string $markerPath,
    string $backupContents,
    array $cleanedRows,
    int $spamRemoved,
    int $testRemoved
): void {
    $cleanedContents = lc_encode_newsletter_csv($cleanedRows);
    $marker = json_encode([
        'completed_at_utc' => gmdate('c'),
        'spam_removed' => $spamRemoved,
        'test_removed' => $testRemoved,
        'kept_rows' => count($cleanedRows),
        'backup_sha256' => hash('sha256', $backupContents),
        'after_sha256' => hash('sha256', $cleanedContents),
        'backup' => LC_NEWSLETTER_CLEANUP_BACKUP,
    ], JSON_UNESCAPED_SLASHES);
    if (!is_string($marker)) {
        throw new RuntimeException('marker_encode_error');
    }
    lc_atomic_write($markerPath, $marker . "\n", 0600);
}

function lc_cleanup_newsletter_storage(
    string $storagePath,
    ?array $spamHashes = null,
    ?array $testHashes = null
): array {
    if (!is_file($storagePath)) {
        throw new RuntimeException('storage_missing');
    }

    $storageDirectory = dirname($storagePath);
    $backupDirectory = $storageDirectory . '/backups';
    $backupPath = $backupDirectory . '/' . LC_NEWSLETTER_CLEANUP_BACKUP;
    $markerPath = $backupDirectory . '/' . LC_NEWSLETTER_CLEANUP_MARKER;

    if (is_file($markerPath)) {
        return [
            'ok' => true,
            'status' => 'already_done',
            'backup' => LC_NEWSLETTER_CLEANUP_BACKUP,
        ];
    }
    if (!is_dir($backupDirectory)
        && !mkdir($backupDirectory, 0700, true)
        && !is_dir($backupDirectory)
    ) {
        throw new RuntimeException('backup_directory_error');
    }

    $handle = fopen($storagePath, 'c+b');
    if ($handle === false) {
        throw new RuntimeException('storage_open_error');
    }
    if (!flock($handle, LOCK_EX)) {
        fclose($handle);
        throw new RuntimeException('storage_lock_error');
    }

    try {
        rewind($handle);
        $originalContents = stream_get_contents($handle);
        if (!is_string($originalContents)) {
            throw new RuntimeException('storage_read_error');
        }

        $rows = lc_parse_newsletter_csv($originalContents);
        $partition = lc_partition_rows($rows, $spamHashes, $testHashes);
        $backupContents = null;
        $status = 'cleaned';

        if (is_file($backupPath)) {
            $backupContents = file_get_contents($backupPath);
            if (!is_string($backupContents)) {
                throw new RuntimeException('backup_read_error');
            }
            $backupRows = lc_parse_newsletter_csv($backupContents);
            $backupPartition = lc_partition_rows($backupRows, $spamHashes, $testHashes);
            if ($backupPartition['spam_removed'] !== 7
                || $backupPartition['test_removed'] !== 1
            ) {
                throw new RuntimeException('backup_targets_mismatch');
            }

            if ($partition['spam_removed'] === 0
                && $partition['test_removed'] === 0
                && lc_rows_start_with($rows, $backupPartition['kept_rows'])
            ) {
                lc_complete_marker($markerPath, $backupContents, $rows, 7, 1);
                return [
                    'ok' => true,
                    'status' => 'recovered_done',
                    'spam_removed' => 7,
                    'test_removed' => 1,
                    'kept_rows' => count($rows),
                    'backup' => LC_NEWSLETTER_CLEANUP_BACKUP,
                ];
            }

            if ($partition['spam_removed'] !== 7
                || $partition['test_removed'] !== 1
                || !lc_rows_start_with($rows, $backupRows)
            ) {
                throw new RuntimeException('recovery_state_mismatch');
            }
            $status = 'cleaned_after_recovery';
        } else {
            if ($partition['spam_removed'] !== 7
                || $partition['test_removed'] !== 1
            ) {
                throw new RuntimeException('reviewed_targets_mismatch');
            }
            lc_atomic_write($backupPath, $originalContents, 0600);
            $backupContents = $originalContents;
        }

        $keptRows = $partition['kept_rows'];
        $cleanedContents = lc_encode_newsletter_csv($keptRows);
        lc_replace_locked_file($handle, $cleanedContents, $originalContents);
        @chmod($storagePath, 0640);
        lc_complete_marker(
            $markerPath,
            (string) $backupContents,
            $keptRows,
            (int) $partition['spam_removed'],
            (int) $partition['test_removed']
        );

        return [
            'ok' => true,
            'status' => $status,
            'spam_removed' => (int) $partition['spam_removed'],
            'test_removed' => (int) $partition['test_removed'],
            'kept_rows' => count($keptRows),
            'backup' => LC_NEWSLETTER_CLEANUP_BACKUP,
        ];
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

function lc_cleanup_response(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function lc_cleanup_main(): void
{
    $cliStoragePath = getenv('LC_NEWSLETTER_CLEANUP_STORAGE_PATH');
    if (PHP_SAPI === 'cli' && is_string($cliStoragePath) && $cliStoragePath !== '') {
        $result = lc_cleanup_newsletter_storage($cliStoragePath);
        echo json_encode($result, JSON_UNESCAPED_SLASHES) . PHP_EOL;
        return;
    }

    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, max-age=0');
    header('X-Content-Type-Options: nosniff');

    $storageDirectory = dirname(__DIR__) . '/newsletter-data';
    $tokenPath = $storageDirectory . '/' . LC_NEWSLETTER_CLEANUP_TOKEN;
    $providedToken = (string) ($_SERVER['HTTP_X_NEWSLETTER_CLEANUP_TOKEN'] ?? '');
    $expectedToken = is_file($tokenPath) ? trim((string) file_get_contents($tokenPath)) : '';

    if ((string) ($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST'
        || $expectedToken === ''
        || !hash_equals($expectedToken, $providedToken)
    ) {
        lc_cleanup_response(404, ['ok' => false, 'status' => 'not_found']);
    }

    try {
        $result = lc_cleanup_newsletter_storage($storageDirectory . '/subscriptions.csv');
        @unlink($tokenPath);
        @unlink(__FILE__);
        lc_cleanup_response(200, $result);
    } catch (Throwable $error) {
        error_log('One-time newsletter cleanup failed: ' . $error->getMessage());
        lc_cleanup_response(409, ['ok' => false, 'status' => 'cleanup_failed']);
    }
}

if (!defined('LC_NEWSLETTER_CLEANUP_LIBRARY_ONLY')) {
    lc_cleanup_main();
}
