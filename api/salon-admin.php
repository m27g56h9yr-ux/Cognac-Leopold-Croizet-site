<?php
declare(strict_types=1);
require __DIR__ . '/salon-lib.php';
salon_headers();
try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') throw new SalonError('method_not_allowed', 405);
    $configFile = __DIR__ . '/salon-config.php';
    $config = is_file($configFile) ? require $configFile : [];
    $adminHash = (string) ($config['admin_token_hash'] ?? '');
    if (getenv('LC_SALON_TEST_MODE') === '1') $adminHash = getenv('LC_SALON_ADMIN_HASH') ?: $adminHash;
    $auth = (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    if (!preg_match('/^Bearer ([a-f0-9]{64})$/D', $auth, $match)
        || strlen($adminHash) !== 64 || !hash_equals($adminHash, hash('sha256', $match[1]))) {
        throw new SalonError('unauthorized', 401);
    }
    $store = salon_store();
    salon_cleanup($store);
    salon_sync_newsletter($store);
    $rows = $store['db']->query('SELECT * FROM contacts ORDER BY channel, changed_at')->fetchAll();
    if (($_GET['format'] ?? '') !== 'csv') {
        $counts = ['active_sms' => 0, 'active_email' => 0, 'withdrawn' => 0, 'expired' => 0];
        foreach ($rows as $r) {
            $k = $r['state'] === 'active' ? 'active_' . $r['channel'] : $r['state'];
            if (isset($counts[$k])) $counts[$k]++;
        }
        salon_response(200, ['ok' => true, 'counts' => $counts, 'encryption' => 'AES-256-GCM',
            'storage' => 'outside_public_root', 'ownership_verification' => 'declared_only', 'newsletter' => salon_newsletter_status($store)]);
    }
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="cognac-leopold-croizet-consentements-' . gmdate('Ymd-His') . '-utc.csv"');
    $out = fopen('php://output', 'wb');
    fputcsv($out, ['brand', 'channel', 'contact', 'consented_at', 'consent_version', 'source',
        'ownership', 'expires_at', 'unsubscribe_url', 'consent_text', 'adult_confirmed'], ',', '"', '');
    foreach ($rows as $r) {
        if ($r['state'] !== 'active') continue;
        $data = salon_decrypt($store, $r['cipher']);
        $token = salon_sign($store, 'manage', ['ids' => [$r['id']]]);
        $cells = [LC_SALON_BRAND, $r['channel'], $data['contact'], $data['consented_at'],
            $data['consent_version'], $data['source'], $data['ownership'], $r['expires_at'],
            LC_SALON_ORIGIN . '/se-retrouver/desinscription/#' . $token, $data['consent_text'], array_key_exists('adult_confirmed', $data) ? ($data['adult_confirmed'] ? 'yes' : 'no') : ''];
        // Prevent formula execution in spreadsheet applications.
        $cells = array_map(static fn ($v) => preg_match('/^[=+@\-\t\r]/u', (string) $v) ? "'" . $v : $v, $cells);
        fputcsv($out, $cells, ',', '"', '');
    }
    fclose($out);
} catch (SalonError $e) {
    salon_response($e->httpStatus, ['ok' => false, 'status' => $e->getMessage()]);
} catch (Throwable $e) {
    error_log('Salon admin unavailable [' . get_class($e) . ']');
    salon_response(503, ['ok' => false, 'status' => 'temporarily_unavailable']);
}

