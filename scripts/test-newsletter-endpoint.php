<?php
declare(strict_types=1);

if (getenv('LC_NEWSLETTER_STORAGE_PATH') === false) {
    fwrite(STDERR, "LC_NEWSLETTER_STORAGE_PATH is required for this test.\n");
    exit(2);
}

putenv('LC_NEWSLETTER_DISABLE_EMAIL=1');

$scenario = (string) ($argv[1] ?? 'normal');
$nowMilliseconds = (int) floor(microtime(true) * 1000);
$payloads = [
    'normal' => [
        'newsletter' => 'person@example.com',
        'company_url' => '',
        'form_started_at' => (string) ($nowMilliseconds - 5000),
    ],
    'duplicate' => [
        'newsletter' => '  PERSON@EXAMPLE.COM  ',
        'company_url' => '',
        'form_started_at' => (string) ($nowMilliseconds - 4000),
    ],
    'honeypot' => [
        'newsletter' => 'observed@example.com',
        'company_url' => 'https://example.net',
        'form_started_at' => (string) ($nowMilliseconds - 200),
    ],
    'concurrent' => [
        'newsletter' => 'concurrent@example.com',
        'company_url' => '',
        'form_started_at' => (string) ($nowMilliseconds - 3000),
    ],
    'risk_log_failure' => [
        'newsletter' => 'riskfail@example.com',
        'company_url' => '',
        'form_started_at' => (string) ($nowMilliseconds - 3000),
    ],
];

if (!isset($payloads[$scenario])) {
    fwrite(STDERR, "Unknown newsletter test scenario.\n");
    exit(2);
}

$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['CONTENT_TYPE'] = 'application/x-www-form-urlencoded';
$_SERVER['REMOTE_ADDR'] = '192.0.2.10';
$_SERVER['HTTP_USER_AGENT'] = 'Newsletter endpoint test';
$_SERVER['HTTP_REFERER'] = 'https://cognac-leopold-croizet.com/en/';
$_SERVER['HTTP_ACCEPT_LANGUAGE'] = 'en-US,en;q=0.9';

$_POST = array_merge($payloads[$scenario], [
    'language' => 'en',
    'page' => 'https://cognac-leopold-croizet.com/en/',
    'consent_version' => 'newsletter-news-2026-06-11',
]);

require dirname(__DIR__) . '/api/newsletter.php';
