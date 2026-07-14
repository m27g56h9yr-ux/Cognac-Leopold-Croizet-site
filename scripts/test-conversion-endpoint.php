<?php
declare(strict_types=1);

if (getenv('LC_CONVERSION_STORAGE_PATH') === false) {
    fwrite(STDERR, "LC_CONVERSION_STORAGE_PATH is required for this test.\n");
    exit(2);
}

putenv('LC_CONVERSION_DISABLE_EMAIL=1');

$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['HTTP_ORIGIN'] = 'https://cognac-leopold-croizet.com';
$_SERVER['CONTENT_TYPE'] = 'application/x-www-form-urlencoded';

$_POST = [
    'event_name' => 'contact_clicked',
    'action_type' => 'visit_page',
    'language' => 'fr',
    'page_path' => '/',
    'product_slug' => '',
    'traffic_source' => 'google',
];

require dirname(__DIR__) . '/api/conversion.php';
