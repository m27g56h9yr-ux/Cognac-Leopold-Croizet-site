import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_ORIGIN = 'https://cognac-leopold-croizet.com';
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function localFileForUrl(urlValue) {
  const url = new URL(urlValue);
  if (url.origin !== PUBLIC_ORIGIN) return null;
  if (url.pathname === '/') return path.join(ROOT, 'index.html');
  return path.join(ROOT, url.pathname.replace(/^\//, ''), 'index.html');
}

const [sitemap, clientScript, endpoint, workflow, htaccess, apiReadme] = await Promise.all([
  readFile(path.join(ROOT, 'sitemap.xml'), 'utf8'),
  readFile(path.join(ROOT, 'assets/js/conversion-tracking.js'), 'utf8'),
  readFile(path.join(ROOT, 'api/conversion.php'), 'utf8'),
  readFile(path.join(ROOT, '.github/workflows/deploy-ovh.yml'), 'utf8'),
  readFile(path.join(ROOT, '.htaccess'), 'utf8'),
  readFile(path.join(ROOT, 'api/README.md'), 'utf8'),
]);

for (const eventName of ['contact_clicked', 'newsletter_submitted', 'partner_order_clicked']) {
  expect(clientScript.includes(eventName), 'client: missing event ' + eventName);
  expect(endpoint.includes("'" + eventName + "'"), 'endpoint: missing allowlist event ' + eventName);
}

expect(clientScript.includes('/api/conversion.php'), 'client: conversion endpoint missing');
expect(clientScript.includes('.info-systeme.success'), 'client: confirmed newsletter success detection missing');
expect(!/(?:localStorage|sessionStorage|document\.cookie)/.test(clientScript), 'client: browser identifier storage is forbidden');
expect(!/(?:REMOTE_ADDR|HTTP_USER_AGENT)/.test(endpoint), 'endpoint: IP address or user agent must not be read');
expect(!/\$input\[['"](?:email|ip|user_agent|referer|visitor_id)['"]\]/.test(endpoint), 'endpoint: PII input must not be accepted');

for (const column of ['created_at', 'event_name', 'language', 'page_path', 'page_group', 'action_type', 'product_slug', 'traffic_source']) {
  expect(endpoint.includes("'" + column + "'"), 'endpoint: missing CSV column ' + column);
}

expect(workflow.match(/conversion-data/g)?.length >= 3, 'deploy: conversion-data must be preserved in every deployment phase');
expect(workflow.match(/conversion-config/g)?.length >= 3, 'deploy: local conversion config must be excluded in every deployment phase');
expect(htaccess.includes('RewriteRule ^conversion-data'), 'server: conversion-data must be blocked publicly');
expect(apiReadme.includes('ni adresse e-mail, ni adresse IP'), 'documentation: privacy boundary missing');

const urls = [...sitemap.matchAll(/<loc>(https:\/\/cognac-leopold-croizet\.com\/[^<]*)<\/loc>/g)].map((match) => match[1]);
expect(urls.length > 0, 'sitemap: no canonical URL found');

for (const urlValue of urls) {
  const localFile = localFileForUrl(urlValue);
  if (!localFile || !existsSync(localFile)) {
    failures.push('sitemap: missing local file for ' + urlValue);
    continue;
  }
  const html = await readFile(localFile, 'utf8');
  if (!/id=["']lc-conversion-tracking-js["'][^>]+conversion-tracking\.js\?v=20260714-1/.test(html)) {
    failures.push(path.relative(ROOT, localFile) + ': conversion client asset missing');
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Checked conversion tracking on ' + urls.length + ' sitemap pages.');
}
