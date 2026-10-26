<?php
declare(strict_types=1);
require __DIR__ . '/salon-lib.php';
salon_headers();
try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') throw new SalonError('method_not_allowed', 405);
    salon_guard_origin();
    $input = salon_input();
    if (!nfc_measure_allowed()) salon_response(200, ['ok' => true, 'status' => 'ignored']);
    $store = salon_store();
    nfc_cleanup($store['db']);
    salon_limit($store, 'nfc', 600);
    nfc_record($store, $input);
    // Viewing/clicking a card never sends mail or touches the contact CSV.
    salon_response(200, ['ok' => true, 'status' => 'recorded']);
} catch (SalonError $e) {
    if ($e->httpStatus === 429) header('Retry-After: 900');
    salon_response($e->httpStatus, ['ok' => false, 'status' => $e->getMessage()]);
} catch (Throwable $e) {
    error_log('NFC counters unavailable [' . get_class($e) . ']');
    salon_response(503, ['ok' => false, 'status' => 'temporarily_unavailable']);
}
