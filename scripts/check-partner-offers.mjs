import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function structuredNodes(html) {
  const nodes = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(match[1]);
      nodes.push(...(Array.isArray(data) ? data : [data]));
    } catch (error) {
      failures.push(`invalid JSON-LD: ${error.message}`);
    }
  }
  return nodes;
}

const [seedRaw, client, sourceClient, endpoint, library, htaccess, workflow] = await Promise.all([
  readFile(path.join(ROOT, 'api/partner-offers-seed.json'), 'utf8'),
  readFile(path.join(ROOT, 'assets/js/partner-offers.js'), 'utf8'),
  readFile(path.join(ROOT, 'static-assets/assets/js/partner-offers.js'), 'utf8'),
  readFile(path.join(ROOT, 'api/partner-offers.php'), 'utf8'),
  readFile(path.join(ROOT, 'api/partner-offers-lib.php'), 'utf8'),
  readFile(path.join(ROOT, '.htaccess'), 'utf8'),
  readFile(path.join(ROOT, '.github/workflows/deploy-ovh.yml'), 'utf8'),
]);

const seed = JSON.parse(seedRaw);
const expectedOffers = {
  vs: ['1021709', '70 cl', 4490, 'InStock'],
  'vs-350': ['533004', '35 cl', 3390, 'InStock'],
  vsop: ['174054', '70 cl', 5490, 'InStock'],
  'vsop-350': ['234764', '35 cl', 3990, 'InStock'],
  'vsop-gift': ['1016261', '70 cl + 2 бокала', 8990, 'InStock'],
  napoleon: ['1020490', '70 cl', 8490, 'InStock'],
  xo: ['1020491', '35 cl', 8790, 'InStock'],
  'xo-exception': ['1005624', '70 cl', 22980, 'InStock'],
  extra: ['174057', '70 cl', 57790, 'OutOfStock'],
  excellence: ['231809', '70 cl', 76990, 'InStock'],
  valentine: ['178511', '35 cl', 7690, 'InStock'],
};
const expectedPages = {
  vs: '1021709',
  vsop: '174054',
  napoleon: '1020490',
  xo: '1020491',
  'xo-exception': '1005624',
  extra: '174057',
  excellence: '231809',
  valentine: '178511',
};

expect(seed.maxAgeSeconds === 604800, 'seed: maximum offer age must be seven days');
expect(seed.refreshIntervalSeconds === 900, 'seed: refresh interval must be fifteen minutes');
expect(
  Object.keys(seed.offers || {}).length === Object.keys(expectedOffers).length,
  `seed: exactly ${Object.keys(expectedOffers).length} exact AV.ru fiches are expected`,
);

for (const [slug, [productId, partnerSize, price, availability]] of Object.entries(expectedOffers)) {
  const offer = seed.offers?.[slug];
  expect(offer?.productId === productId, `${slug}: partner product id mismatch`);
  expect(offer?.partnerSize === partnerSize, `${slug}: partner format mismatch`);
  expect(Number(offer?.price) === price, `${slug}: verified seed price mismatch`);
  expect(offer?.availability === `https://schema.org/${availability}`, `${slug}: availability mismatch`);
  expect(offer?.url === `https://av.ru/i/${productId}`, `${slug}: partner URL mismatch`);
  expect(/Z$/.test(offer?.checkedAt || ''), `${slug}: checkedAt must be an absolute UTC timestamp`);
}

for (const [slug, productId] of Object.entries(expectedPages)) {
  const relativeFile = `ru/collection/${slug}/index.html`;
  const html = await readFile(path.join(ROOT, relativeFile), 'utf8');
  expect(new RegExp(`id=["']lc-partner-offer-js["'][^>]+data-product-slug=["']${slug}["']`).test(html), `${relativeFile}: dynamic offer loader missing`);
  expect(html.includes(`href="https://av.ru/i/${productId}"`), `${relativeFile}: AV.ru CTA missing`);
  expect(!/data-partner-offer-price=["']/.test(html), `${relativeFile}: generated HTML must not retain a static price`);

  const product = structuredNodes(html).find((node) => node?.['@type'] === 'Product' && String(node.url || '').includes(`/ru/collection/${slug}/`));
  expect(product && !product.offers, `${relativeFile}: generated Product must remain offer-free until runtime freshness validation`);
}

const heritageHtml = await readFile(path.join(ROOT, 'ru/collection/heritage/index.html'), 'utf8');
expect(!heritageHtml.includes('lc-partner-offer-js'), 'heritage: dynamic loader forbidden without an exact AV.ru product page');

for (const locale of ['', 'en/', 'da/', 'sv/', 'no/', 'zh/']) {
  const html = await readFile(path.join(ROOT, `${locale}collection/vsop/index.html`), 'utf8');
  expect(!html.includes('lc-partner-offer-js'), `${locale || 'fr/'}collection/vsop: Russian offer loader leaked into another locale`);
}

for (const required of ['/api/partner-offers.php?slug=', 'lcPartnerOfferReady', 'data-partner-offer-price', 'priceValidUntil', "seller: { '@type': 'Organization', name: 'AV.ru' }"]) {
  expect(client.includes(required), `client: missing ${required}`);
}
expect(!client.includes('av.ru/occ/api'), 'client: cross-origin AV.ru API calls are forbidden');
expect(client === sourceClient, 'client: generated partner loader must match its static-assets source');
expect(
  client.includes('sizeInMilliliters') && client.includes('partnerSize !== productSize'),
  'client: partner and official product formats must be compared before injecting Offer',
);
expect(endpoint.includes('fastcgi_finish_request'), 'endpoint: background refresh response flush missing');
expect(library.includes('/occ/api/v1/products/'), 'library: AV.ru product API missing');
expect(library.includes('LOCK_EX | LOCK_NB'), 'library: refresh lock missing');
expect(library.includes("'/refresh.lock'"), 'library: cache writes must share one refresh lock');
expect(library.includes('LC_PARTNER_MAX_AGE_SECONDS = 604800'), 'library: stale prices must expire after seven days');
expect(library.includes("['croizet', 'vsop']"), 'library: product identity validation missing');
expect(htaccess.includes('RewriteRule ^partner-data'), 'server: partner cache must be blocked publicly');
expect(workflow.match(/partner-data/g)?.length >= 3, 'deploy: partner cache must be preserved in every deployment phase');
expect(workflow.includes('php -l api/partner-offers-lib.php'), 'deploy: partner library PHP lint missing');
expect(workflow.includes('php -l api/partner-offers.php'), 'deploy: partner endpoint PHP lint missing');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Checked ${Object.keys(expectedOffers).length} dynamic AV.ru offers on ${Object.keys(expectedPages).length} Russian product pages.`);
}
