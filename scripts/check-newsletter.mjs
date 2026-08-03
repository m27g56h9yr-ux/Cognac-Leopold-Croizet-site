import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const homeFiles = [
  'index.html',
  'en/index.html',
  'ru/index.html',
  'da/index.html',
  'sv/index.html',
  'no/index.html',
  'zh/index.html',
];
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function count(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function attribute(tag, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return tag.match(new RegExp(`\\b${escapedName}=(["'])(.*?)\\1`, 'i'))?.[2] || '';
}

for (const relativeFile of homeFiles) {
  const html = await readFile(path.join(ROOT, relativeFile), 'utf8');
  const form = html.match(/<form\b(?=[^>]*class=["'][^"']*\bcontainer-newsletter\b[^"']*["'])[^>]*>[\s\S]*?<\/form>/i)?.[0] || '';
  expect(form !== '', `${relativeFile}: newsletter form missing`);
  if (!form) continue;

  expect(count(form, /\bname=["']company_url["']/gi) === 1, `${relativeFile}: expected exactly one honeypot`);
  expect(count(form, /\bname=["']form_started_at["']/gi) === 1, `${relativeFile}: expected exactly one timing field`);

  const trap = form.match(/<div\b(?=[^>]*class=["'][^"']*\blc-newsletter-trap\b[^"']*["'])[^>]*>/i)?.[0] || '';
  const trapInput = form.match(/<input\b(?=[^>]*\bname=["']company_url["'])[^>]*>/i)?.[0] || '';
  const timingInput = form.match(/<input\b(?=[^>]*\bname=["']form_started_at["'])[^>]*>/i)?.[0] || '';

  expect(attribute(trap, 'aria-hidden') === 'true', `${relativeFile}: honeypot must be hidden from assistive technology`);
  expect(attribute(trap, 'style').includes('left:-10000px'), `${relativeFile}: honeypot must remain outside the visible layout`);
  expect(attribute(trapInput, 'type') === 'text', `${relativeFile}: honeypot must be a text field`);
  expect(attribute(trapInput, 'tabindex') === '-1', `${relativeFile}: honeypot must be absent from keyboard navigation`);
  expect(attribute(trapInput, 'autocomplete') === 'off', `${relativeFile}: honeypot autocomplete must be disabled`);
  expect(!/\brequired\b/i.test(trapInput), `${relativeFile}: honeypot must never be required`);
  expect(attribute(timingInput, 'type') === 'hidden', `${relativeFile}: timing signal must be hidden`);
}

const [clientScript, endpoint, generator, builder, readme] = await Promise.all([
  readFile(path.join(ROOT, 'wp-content/plugins/newsletter-pc/assets/js/frontend/newsletter-pc.js'), 'utf8'),
  readFile(path.join(ROOT, 'api/newsletter.php'), 'utf8'),
  readFile(path.join(ROOT, 'scripts/seo-hardening.mjs'), 'utf8'),
  readFile(path.join(ROOT, 'scripts/build-static-site.mjs'), 'utf8'),
  readFile(path.join(ROOT, 'api/README.md'), 'utf8'),
]);

expect(clientScript.includes("input[name='form_started_at']"), 'client: form timing initialization missing');
expect(/\btimeout\s*:\s*10000/.test(clientScript), 'client: bounded AJAX timeout missing');
expect(/\bdataType\s*:\s*["']json["']/.test(clientScript), 'client: JSON response type missing');
expect(/\bjsonp\s*:\s*false/.test(clientScript), 'client: JSONP must remain disabled');
expect(!/(?:turnstile|captcha)/i.test(clientScript), 'client: external or visible challenge must not be added');

expect(endpoint.includes("'risk_log_path'"), 'endpoint: separate risk log path missing');
expect(endpoint.includes("'created' => false"), 'endpoint: exact duplicate handling missing');
expect(endpoint.includes("'already_registered'"), 'endpoint: duplicate success response missing');
expect(endpoint.includes("'honeypot_filled'"), 'endpoint: honeypot observation signal missing');
expect(
  /function\s+newsletter_attachment_filename\(\):\s*string/.test(endpoint),
  'endpoint: site-specific attachment filename helper missing',
);
expect(
  endpoint.includes("'cognac-leopold-croizet-newsletter-inscriptions-'"),
  'endpoint: attachment filename must identify Cognac Léopold Croizet',
);
expect(endpoint.includes("gmdate('Ymd-His')"), 'endpoint: attachment filename timestamp missing');
expect(
  endpoint.includes(`'Content-Type: text/csv; charset=UTF-8; name="' . $attachmentFilename . '"'`),
  'endpoint: MIME content name must use the site-specific attachment filename',
);
expect(
  endpoint.includes(`'Content-Disposition: attachment; filename="' . $attachmentFilename . '"'`),
  'endpoint: MIME attachment filename must use the site-specific filename',
);
expect(
  !endpoint.includes('filename="subscriptions.csv"') && !endpoint.includes('name="subscriptions.csv"'),
  'endpoint: generic newsletter attachment filename must not return',
);
expect(generator.includes('lc-newsletter-trap'), 'generator: durable honeypot markup missing');
expect(builder.includes('ensureNewsletterClientScript'), 'builder: durable newsletter client repair missing');
expect(readme.includes('aucun rejet, aucun CAPTCHA'), 'documentation: non-blocking behavior missing');
expect(
  readme.includes('cognac-leopold-croizet-newsletter-inscriptions-AAAAMMJJ-HHMMSS-utc.csv'),
  'documentation: site-specific attachment filename convention missing',
);

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Checked non-blocking newsletter protection on ${homeFiles.length} language homepages.`);
}
