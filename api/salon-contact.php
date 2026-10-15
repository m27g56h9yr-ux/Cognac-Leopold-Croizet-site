<?php
declare(strict_types=1);
require __DIR__ . '/salon-lib.php';
salon_headers();
$store = null;
try {
    $method = (string) ($_SERVER['REQUEST_METHOD'] ?? '');
    if (!in_array($method, ['GET', 'POST'], true)) throw new SalonError('method_not_allowed', 405);
    $store = salon_store();
    salon_cleanup($store);
    salon_sync_newsletter($store);
    if ($method === 'GET') {
        if (($_GET['action'] ?? '') === 'health') {
            salon_response(200, ['ok' => true, 'status' => 'ready', 'version' => LC_SALON_VERSION, 'brand' => LC_SALON_BRAND]);
        }
        salon_limit($store, 'challenge', 120);
        salon_response(200, ['ok' => true, 'challenge' => salon_challenge($store), 'consent_version' => LC_SALON_VERSION]);
    }
    salon_guard_origin();
    $input = salon_input();
    $action = $input['action'] ?? 'subscribe';
    if (!in_array($action, ['subscribe', 'inspect', 'withdraw'], true)) throw new SalonError('invalid_action', 400);
    salon_limit($store, $action, $action === 'subscribe' ? 12 : 60);
    if (!empty($input['company_url'])) throw new SalonError('submission_rejected', 422);
    $db = $store['db'];
    $db->exec('BEGIN IMMEDIATE');
    try {
        salon_consume($store, (string) ($input['challenge'] ?? ''));
        if ($action === 'subscribe') $result = salon_subscribe($store, $input);
        elseif ($action === 'inspect') $result = salon_inspect($store, $input);
        else $result = salon_withdraw($store, $input);
        $db->exec('COMMIT');
    } catch (Throwable $e) {
        $db->exec('ROLLBACK');
        throw $e;
    }
    salon_sync_newsletter($store);
    salon_response(200, $result);
} catch (SalonError $e) {
    if ($e->httpStatus === 429) header('Retry-After: 900');
    salon_response($e->httpStatus, ['ok' => false, 'status' => $e->getMessage()]);
} catch (Throwable $e) {
    // Log no input, coordinates, key, database path, or capability token.
    error_log('Salon consent storage unavailable [' . get_class($e) . ']');
    salon_response(503, ['ok' => false, 'status' => 'temporarily_unavailable']);
}

