<?php
declare(strict_types=1);
require_once __DIR__ . '/salon-lib.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(405, ['ok' => false, 'status' => 'method_not_allowed']);
$config = newsletter_config();
$input = request_data();
$email = strtolower(trim((string) ($input['email'] ?? $input['newsletter'] ?? '')));
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_response(422, ['ok' => false, 'status' => 'invalid_email']);
$risk = newsletter_risk_signals($input);
try {
    $store = salon_store();
    salon_cleanup($store);
    salon_sync_newsletter($store);
    $context = newsletter_context((string) ($input['page'] ?? ''), (string) ($input['language'] ?? ''),
        (string) ($input['consent_version'] ?? 'newsletter-news-2026-06-11'));
    $db = $store['db'];
    $db->exec('BEGIN IMMEDIATE');
    try {
        $now = $context['created_at'];
        $id = salon_id($store, 'email', $email);
        $record = ['brand' => LC_SALON_BRAND, 'channel' => 'email', 'contact' => $email,
            'consented_at' => $now, 'consent_version' => $context['consent_version'],
            'consent_text' => '', 'source' => 'site-newsletter', 'page' => $context['page'],
            'ownership' => 'declared_not_verified'];
        $q = $db->prepare('INSERT INTO contacts VALUES (?, "email", "active", ?, ?, ?, ?, "declared")
            ON CONFLICT(id) DO UPDATE SET state="active", cipher=excluded.cipher,
            changed_at=excluded.changed_at, expires_at=excluded.expires_at');
        $q->execute([$id, salon_encrypt($store, $record), $now, $now, gmdate('c', strtotime('+3 years'))]);
        salon_event($store, $id, 'email', 'consent_granted', ['consent_version' => $context['consent_version'],
            'source' => 'site-newsletter', 'page' => $context['page'], 'language' => $context['language'],
            'positive_action' => 'newsletter_form_submit']);
        $operation = salon_queue($store, ['action' => 'add', 'newsletter' => true, 'selected' => ['email' => $email],
            'context' => $context, 'texts' => [], 'notify' => true]);
        $db->exec('COMMIT');
    } catch (Throwable $e) { $db->exec('ROLLBACK'); throw $e; }
    $sync = salon_sync_newsletter($store);
    $created = $sync['applied'][$operation] ?? false;
    // Another request may already have drained this operation. The CSV remains deduplicated.
    $status = !$created ? 'already_registered' : ($sync['mail_sent'] ? 'saved_and_emailed' : 'saved_email_failed');
    append_risk_event($config, $risk, !$created ? 'duplicate' : ($sync['mail_sent'] ? 'saved' : 'saved_email_failed'));
    json_response(200, ['ok' => true, 'status' => $status]);
} catch (Throwable $e) {
    error_log('Shared newsletter storage unavailable [' . get_class($e) . ']');
    append_risk_event($config, $risk, 'storage_error');
    json_response(503, ['ok' => false, 'status' => 'temporarily_unavailable']);
}
