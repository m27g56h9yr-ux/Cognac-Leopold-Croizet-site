import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEPLOY_BASE_PATH, GITHUB_PAGES_BASE_PATH, PUBLIC_ORIGIN } from './deploy-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const checkedFiles = [];
const missing = [];
const dynamicReferences = [];
const brandViolations = [];
const competitorReferenceViolations = [];
const pineauRedCollectionViolations = [];
const pineauRedProductNavigationViolations = [];
const collectionEndPageLayoutViolations = [];
const legacyDeployBaseViolations = [];
const imageDimensionViolations = [];
const missingImageAltViolations = [];
const formLabelViolations = [];
const productAltViolations = [];
const homeMediaViolations = [];
const languageMenuViolations = [];
const partnerOfferViolations = [];
const structuredDataEntityViolations = [];
const siteLanguages = ['fr', 'en', 'ru', 'da', 'sv', 'no', 'zh'];
const languageMenuExpectedLabels = ['Français', 'English', 'Русский', 'Dansk', 'Svenska', 'Norsk', '中文'];
const languageMenuExpectedHreflangs = ['fr', 'en', 'ru', 'da', 'sv', 'no', 'zh-CN'];
const forbiddenCompetitorReferences = [
  {
    label: 'competitor domain croizet.fr',
    pattern: /https?:\/\/(?:www\.)?croizet\.fr\b[^\s"'<>)]*/gi,
  },
  {
    label: 'Inshaker article about the competing Cognac Croizet brand',
    pattern: /https?:\/\/ru\.inshaker\.com\/trends\/znaniya\/croizet-elitnyy-konyak-s-200-letney-istoriey\b[^\s"'<>)]*/gi,
  },
];
const WALK_SKIP_DIRS = new Set([
  '.agents',
  '.github',
  '.git',
  'api',
  'assets',
  'newsletter-data',
  'node_modules',
  'outputs',
  'scripts',
  'static-assets',
  'tmp',
  'wp-content',
  'wp-includes',
]);
const productImageAltRules = [
  [/img_prod_xo_exception_home|img_nom_produit_xo-exception/i, /Cognac Léopold Croizet XO Exception/i],
  [/img_produit_vs_base2|VS_2024/i, /Cognac Léopold Croizet VS/i],
  [/img_produit_vsop_base|VSOP_2024/i, /Cognac Léopold Croizet VSOP/i],
  [/img_produit_napoleon_base|NAPOLEON_2024/i, /Cognac Léopold Croizet Napoléon/i],
  [/img_produit_xo_base|XO_2024/i, /Cognac Léopold Croizet XO/i],
  [/extra-bt-|img_nom_produit_extra|img_produit_extra_base/i, /Cognac Léopold Croizet Extra/i],
  [/img_excellence_etui|img_produit_excellence|img_nom_produit_excellence/i, /Cognac Léopold Croizet Excellence/i],
  [/img_produit_heritage|img_nom_produit_heritage/i, /Cognac Léopold Croizet Héritage/i],
  [/img_produit_valentine|img_nom_produit_valentine/i, /Cognac Léopold Croizet Valentine XO/i],
  [/pineau-des-charentes-rouge/i, /Pineau Rouge des Charentes Léopold Croizet/i],
  [/img_produit_pineau_base|img_diapo_pineau|img_nom_produit_pineau/i, /Pineau des Charentes Léopold Croizet/i],
];
const russianPartnerPages = [
  { slug: 'vs', url: 'https://av.ru/i/1021709', productName: 'Cognac Léopold\u00a0Croizet VS', partnerSize: '70 cl', officialSize: '700 ml', lastmod: '2026-07-14' },
  { slug: 'vsop', url: 'https://av.ru/i/174054', productName: 'Cognac Léopold\u00a0Croizet VSOP', partnerSize: '70 cl', officialSize: '700 ml', lastmod: '2026-07-14', forbiddenUrls: ['https://av.ru/i/1016261'] },
  { slug: 'napoleon', url: 'https://av.ru/i/1020490', productName: 'Cognac Léopold\u00a0Croizet Napoléon', partnerSize: '70 cl', officialSize: '700 ml', lastmod: '2026-07-14' },
  { slug: 'xo', url: 'https://av.ru/i/1020491', productName: 'Cognac Léopold\u00a0Croizet XO', partnerSize: '35 cl', officialSize: '700 ml', lastmod: '2026-07-14' },
  { slug: 'xo-exception', url: 'https://av.ru/i/1005624', productName: 'Cognac Léopold\u00a0Croizet XO Exception', partnerSize: '70 cl', officialSize: '700 ml', lastmod: '2026-07-14' },
  { slug: 'extra', url: 'https://av.ru/i/174057', productName: 'Cognac Léopold\u00a0Croizet Extra', partnerSize: '70 cl', officialSize: '700 ml', lastmod: '2026-07-14' },
  { slug: 'excellence', url: 'https://av.ru/i/231809', productName: 'Cognac Léopold\u00a0Croizet Excellence', partnerSize: '70 cl', officialSize: '700 ml', lastmod: '2026-07-14' },
  { slug: 'heritage' },
  { slug: 'valentine', url: 'https://av.ru/i/178511', productName: 'Cognac Léopold\u00a0Croizet Valentine XO', partnerSize: '35 cl', officialSize: '350 ml', lastmod: '2026-07-14' },
];


await walk(ROOT);
partnerOfferViolations.push(...await findPartnerOfferViolations());

for (const file of checkedFiles) {
  const text = await readFile(file, 'utf8');
  const relativeFile = path.relative(ROOT, file);

  for (const localUrl of extractLocalUrls(text)) {
    if (localUrl.startsWith('/wp-json') || localUrl.includes('/xmlrpc.php') || localUrl.includes('/wp-admin/')) {
      dynamicReferences.push(`${relativeFile}: ${localUrl}`);
      continue;
    }

    if (!localTargetExists(localUrl)) {
      missing.push(`${relativeFile}: ${localUrl}`);
    }
  }

  for (const external of text.matchAll(/https?:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|stackpath\.bootstrapcdn\.com|maxcdn\.bootstrapcdn\.com|cdnjs\.cloudflare\.com|kit\.fontawesome\.com|use\.fontawesome\.com)[^\s"'<>)]*/gi)) {
    dynamicReferences.push(`${relativeFile}: ${external[0]}`);
  }

  for (const dynamic of text.matchAll(/\b(?:admin-ajax\.php|wc-ajax|wp-json|xmlrpc\.php)\b/gi)) {
    dynamicReferences.push(`${relativeFile}: ${dynamic[0]}`);
  }

  for (const malformed of text.matchAll(/https?:\\?\/wp-content[^\s"'<>)]*/gi)) {
    dynamicReferences.push(`${relativeFile}: malformed ${malformed[0]}`);
  }

  if (relativeFile.endsWith('.html')) {
    if (DEPLOY_BASE_PATH !== GITHUB_PAGES_BASE_PATH && text.includes(GITHUB_PAGES_BASE_PATH)) {
      legacyDeployBaseViolations.push(`${relativeFile}: contains ${GITHUB_PAGES_BASE_PATH}`);
    }
    brandViolations.push(...findBrandViolations(text, relativeFile));
    competitorReferenceViolations.push(...findCompetitorReferenceViolations(text, relativeFile));
    imageDimensionViolations.push(...findImageDimensionViolations(text, relativeFile));
    missingImageAltViolations.push(...findMissingImageAltViolations(text, relativeFile));
    formLabelViolations.push(...findFormLabelViolations(text, relativeFile));
    productAltViolations.push(...findProductAltViolations(text, relativeFile));
    homeMediaViolations.push(...findHomeMediaViolations(text, relativeFile));
    languageMenuViolations.push(...findLanguageMenuViolations(text, relativeFile));
    structuredDataEntityViolations.push(...findStructuredDataEntityViolations(text, relativeFile));
    pineauRedCollectionViolations.push(...findPineauRedCollectionViolations(text, relativeFile));
    pineauRedProductNavigationViolations.push(...findPineauRedProductNavigationViolations(text, relativeFile));
    collectionEndPageLayoutViolations.push(...findCollectionEndPageLayoutViolations(text, relativeFile));
  }
}

if (
  missing.length
  || dynamicReferences.length
  || brandViolations.length
  || competitorReferenceViolations.length
  || pineauRedCollectionViolations.length
  || pineauRedProductNavigationViolations.length
  || collectionEndPageLayoutViolations.length
  || legacyDeployBaseViolations.length
  || imageDimensionViolations.length
  || missingImageAltViolations.length
  || formLabelViolations.length
  || productAltViolations.length
  || homeMediaViolations.length
  || languageMenuViolations.length
  || partnerOfferViolations.length
  || structuredDataEntityViolations.length
) {
  if (missing.length) {
    console.error('Missing local targets:');
    for (const item of missing.slice(0, 60)) console.error(`- ${item}`);
  }

  if (dynamicReferences.length) {
    console.error('Dynamic/internal references left:');
    for (const item of dynamicReferences.slice(0, 60)) console.error(`- ${item}`);
  }

  if (brandViolations.length) {
    console.error('Brand rule violations:');
    for (const item of brandViolations.slice(0, 60)) console.error(`- ${item}`);
  }

  if (competitorReferenceViolations.length) {
    console.error('Competitor brand/source references left in generated HTML:');
    for (const item of competitorReferenceViolations.slice(0, 60)) console.error(`- ${item}`);
  }

  if (pineauRedCollectionViolations.length) {
    console.error('Pineau Rouge collection thumbnail regressions:');
    for (const item of pineauRedCollectionViolations.slice(0, 60)) console.error(`- ${item}`);
  }

  if (pineauRedProductNavigationViolations.length) {
    console.error('Pineau Rouge product navigation regressions:');
    for (const item of pineauRedProductNavigationViolations.slice(0, 60)) console.error(`- ${item}`);
  }

  if (collectionEndPageLayoutViolations.length) {
    console.error('Collection end-page layout regressions:');
    for (const item of collectionEndPageLayoutViolations.slice(0, 60)) console.error(`- ${item}`);
  }

  if (legacyDeployBaseViolations.length) {
    console.error('Legacy deploy base references left in generated HTML:');
    for (const item of legacyDeployBaseViolations.slice(0, 60)) console.error(`- ${item}`);
  }

  if (imageDimensionViolations.length) {
    console.error('Images without stable dimensions:');
    for (const item of imageDimensionViolations.slice(0, 60)) console.error(`- ${item}`);
  }

  if (missingImageAltViolations.length) {
    console.error('Images without alt attributes:');
    for (const item of missingImageAltViolations.slice(0, 60)) console.error(`- ${item}`);
  }

  if (formLabelViolations.length) {
    console.error('Useful form controls without accessible labels:');
    for (const item of formLabelViolations.slice(0, 60)) console.error(`- ${item}`);
  }

  if (productAltViolations.length) {
    console.error('Important product images without descriptive alt text:');
    for (const item of productAltViolations.slice(0, 60)) console.error(`- ${item}`);
  }

  if (homeMediaViolations.length) {
    console.error('Homepage media loading regressions:');
    for (const item of homeMediaViolations.slice(0, 60)) console.error(`- ${item}`);
  }

  if (languageMenuViolations.length) {
    console.error('Language menu regressions:');
    for (const item of languageMenuViolations.slice(0, 60)) console.error(`- ${item}`);
  }

  if (partnerOfferViolations.length) {
    console.error('Russian partner offer regressions:');
    for (const item of partnerOfferViolations.slice(0, 60)) console.error(`- ${item}`);
  }

  if (structuredDataEntityViolations.length) {
    console.error('Structured data entity regressions:');
    for (const item of structuredDataEntityViolations.slice(0, 60)) console.error(`- ${item}`);
  }

  process.exit(1);
}

console.log(`Checked ${checkedFiles.length} HTML/CSS files`);

async function walk(dir) {
  if (dir.includes(`${path.sep}.git${path.sep}`)) return;
  if (dir.includes(`${path.sep}_deploy${path.sep}`) || dir.endsWith(`${path.sep}_deploy`)) return;
  if (dir.includes(`${path.sep}_preview${path.sep}`) || dir.endsWith(`${path.sep}_preview`)) return;
  const entries = await readdir(dir);
  for (const entry of entries) {
    if (WALK_SKIP_DIRS.has(entry)) continue;
    if (/ \d+$/.test(entry)) continue;
    const fullPath = path.join(dir, entry);
    const info = await stat(fullPath);
    if (info.isDirectory()) {
      await walk(fullPath);
    } else if (entry === 'index.html' || /\.css$/.test(entry)) {
      checkedFiles.push(fullPath);
    }
  }
}

function extractLocalUrls(text) {
  const urls = new Set();
  for (const [, value] of text.matchAll(/\b(?:href|src|poster|action|data-src|data-large_image|data-thumb|data-background|data-bg|content)=["'](\/[^"']+)["']/gi)) {
    urls.add(value);
  }
  for (const [, , value] of text.matchAll(/url\((['"]?)(\/[^'")]+)\1\)/gi)) {
    urls.add(value);
  }
  for (const [, value] of text.matchAll(/["'](\/[^"']+\.(?:css|js|jpg|jpeg|png|gif|svg|webp|avif|mp4|webm|woff2?|ttf|eot|otf|json|ico))["']/gi)) {
    urls.add(value);
  }
  return [...urls]
    .map((url) => url.split('#')[0].split('?')[0].trim())
    .filter((url) => url.length > 1 && url !== '/' && url !== '"' && url !== "'");
}

function localTargetExists(localUrl) {
  if (localUrl === '/') return existsSync(path.join(ROOT, 'index.html'));
  if (DEPLOY_BASE_PATH && localUrl === `${DEPLOY_BASE_PATH}/`) {
    return existsSync(path.join(ROOT, 'index.html'));
  }
  if (DEPLOY_BASE_PATH && localUrl.startsWith(`${DEPLOY_BASE_PATH}/`)) {
    localUrl = localUrl.slice(DEPLOY_BASE_PATH.length);
  }
  const variants = [localUrl];
  try {
    const decoded = decodeURIComponent(localUrl);
    if (decoded !== localUrl) variants.push(decoded);
  } catch {
    // Keep the raw path when a URL is partially encoded by WordPress.
  }

  return variants.some((variant) => {
    const localPath = variant.replace(/^\/+/, '');
    const fileTarget = path.join(ROOT, localPath);
    const pageTarget = path.join(ROOT, localPath, 'index.html');
    return existsSync(fileTarget) || existsSync(pageTarget);
  });
}

async function findPartnerOfferViolations() {
  const violations = [];
  const trackingHtml = await readFile(path.join(ROOT, 'suivi-vendeurs.html'), 'utf8');
  const trackingPayload = extractSellerTrackingPayload(trackingHtml);
  const trackingRows = new Map((trackingPayload?.rows || []).map((row) => [row.product_slug, row]));
  const sitemap = await readFile(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const sellerEndpoint = await readFile(path.join(ROOT, 'suivi-vendeurs-data.php'), 'utf8');

  if (trackingPayload?.maxOfferAgeDays !== 7) {
    violations.push(`suivi-vendeurs.html: maxOfferAgeDays must be 7, found ${trackingPayload?.maxOfferAgeDays ?? 'missing'}`);
  }
  if (!partnerOfferDataIsFresh('2026-07-07', 7, new Date('2026-07-14T23:59:59Z'))) {
    violations.push('partner offer freshness: a seven-day-old observation should remain valid through the end of day 7');
  }
  if (partnerOfferDataIsFresh('2026-07-07', 7, new Date('2026-07-15T00:00:00Z'))) {
    violations.push('partner offer freshness: an observation must expire after seven days');
  }
  if (/\bfallback_(?:price|list_price)\b/.test(sellerEndpoint)) {
    violations.push('suivi-vendeurs-data.php: stale fallback prices must not be exposed after an unverifiable refresh');
  }

  for (const expected of russianPartnerPages) {
    const relativeFile = `ru/collection/${expected.slug}/index.html`;
    const file = path.join(ROOT, relativeFile);
    if (!existsSync(file)) {
      violations.push(`${relativeFile}: page missing`);
      continue;
    }

    const html = await readFile(file, 'utf8');
    const partnerCtaUrls = extractPartnerCtaUrls(html);
    const product = extractMainProductSchema(html, expected.slug);
    const webPage = extractWebPageSchema(html, expected.slug);
    const trackingRow = trackingRows.get(expected.slug);

    if (!trackingRow) {
      violations.push(`suivi-vendeurs.html: missing tracking evidence for ${expected.slug}`);
    } else {
      if (trackingRow.source_url !== (expected.url || 'https://av.ru/search/?freeText=Leopold%20Croizet%20Heritage')) {
        violations.push(`suivi-vendeurs.html: source URL mismatch for ${expected.slug}`);
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trackingRow.checked_at || '')) {
        violations.push(`suivi-vendeurs.html: checked_at missing for ${expected.slug}`);
      }
      if (!trackingRow.geographic_context) {
        violations.push(`suivi-vendeurs.html: geographic context missing for ${expected.slug}`);
      }
      if (trackingRow.offers) {
        if (!trackingRow.offers.price || !trackingRow.offers.availability) {
          violations.push(`suivi-vendeurs.html: incomplete Offer for ${expected.slug}`);
        }
        if (!partnerOfferDataIsFresh(trackingRow.checked_at, trackingPayload.maxOfferAgeDays)) {
          violations.push(`suivi-vendeurs.html: stale Offer retained for ${expected.slug}`);
        }
      }
    }

    if (expected.url) {
      if (!partnerCtaUrls.includes(expected.url)) {
        violations.push(`${relativeFile}: missing partner CTA ${expected.url}`);
      }
      for (const url of partnerCtaUrls) {
        if (url !== expected.url) violations.push(`${relativeFile}: unexpected partner CTA ${url}`);
      }
    } else if (partnerCtaUrls.length) {
      violations.push(`${relativeFile}: partner CTA published without an exact AV.ru product page`);
    }

    if (!product) {
      violations.push(`${relativeFile}: main Product JSON-LD missing`);
      continue;
    }

    if (product.offers) violations.push(`${relativeFile}: Offer published without a fresh, geography-aware visible offer`);
    if (/\bdata-partner-offer-price=["']/i.test(html)) violations.push(`${relativeFile}: visible price published without a fresh matching Offer`);

    if (expected.partnerSize) {
      const visiblePartnerSize = html.match(/\bdata-partner-product-size=["']([^"']+)["']/i)?.[1];
      const action = webPage?.potentialAction;
      if (visiblePartnerSize !== expected.partnerSize) violations.push(`${relativeFile}: visible partner size does not match ${expected.partnerSize}`);
      if (product.size !== expected.officialSize) violations.push(`${relativeFile}: official Product size must remain ${expected.officialSize}`);
      if (action?.['@type'] !== 'BuyAction') violations.push(`${relativeFile}: partner BuyAction missing`);
      if (action?.target?.urlTemplate !== expected.url) violations.push(`${relativeFile}: BuyAction URL does not match the partner CTA`);
      if (action?.object?.name !== `${expected.productName} ${expected.partnerSize}`) violations.push(`${relativeFile}: BuyAction product context does not match ${expected.productName} ${expected.partnerSize}`);
      if (action?.seller?.name !== 'AV.ru') violations.push(`${relativeFile}: BuyAction seller is not AV.ru`);
      if (!new RegExp(`aria-label=["'][^"']*${escapeRegExp(expected.productName.replace('\u00a0', ' '))}[^"']*AV\\.ru`, 'i').test(html)) {
        violations.push(`${relativeFile}: partner CTA accessible label must identify the product and AV.ru`);
      }
    } else if (webPage?.potentialAction?.['@type'] === 'BuyAction') {
      violations.push(`${relativeFile}: BuyAction published without an exact product page and format`);
    }

    const sitemapLastmod = sitemapLastmodForRoute(sitemap, `/ru/collection/${expected.slug}/`);
    if (expected.lastmod) {
      if (webPage?.dateModified !== expected.lastmod) violations.push(`${relativeFile}: dateModified must be ${expected.lastmod}`);
      if (sitemapLastmod !== expected.lastmod) violations.push(`${relativeFile}: sitemap lastmod must be ${expected.lastmod}`);
    }

    for (const forbiddenUrl of expected.forbiddenUrls || []) {
      if (html.includes(forbiddenUrl)) violations.push(`${relativeFile}: obsolete partner URL remains (${forbiddenUrl})`);
    }

    for (const localePrefix of ['', 'en/', 'da/', 'sv/', 'no/', 'zh/']) {
      const localizedFile = path.join(ROOT, `${localePrefix}collection/${expected.slug}/index.html`);
      if (!existsSync(localizedFile)) continue;
      const localizedHtml = await readFile(localizedFile, 'utf8');
      if (extractPartnerCtaUrls(localizedHtml).length) {
        violations.push(`${path.relative(ROOT, localizedFile)}: Russian partner CTA leaked into another locale`);
      }
      if (/"@type":"BuyAction"/.test(localizedHtml)) {
        violations.push(`${path.relative(ROOT, localizedFile)}: Russian BuyAction leaked into another locale`);
      }
    }
  }

  const vsopHtml = await readFile(path.join(ROOT, 'ru/collection/vsop/index.html'), 'utf8');
  if (/(?:5\s*480|5480|6\s*290|6290)\s*₽?/.test(vsopHtml)) {
    violations.push('ru/collection/vsop/index.html: a Moscow-specific or divergent AV.ru price remains visible');
  }

  return violations;
}

function partnerOfferDataIsFresh(observedAtValue, maxAgeDays, asOf = new Date()) {
  const observedAt = new Date(`${observedAtValue || ''}T23:59:59Z`);
  if (Number.isNaN(observedAt.getTime()) || !Number.isFinite(maxAgeDays) || maxAgeDays <= 0) return false;
  const expiresAt = new Date(observedAt.getTime() + maxAgeDays * 24 * 60 * 60 * 1000);
  return asOf.getTime() <= expiresAt.getTime();
}

function extractSellerTrackingPayload(html) {
  const raw = html.match(/<script\b[^>]*id=["']seller-tracking-data["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function sitemapLastmodForRoute(sitemap, route) {
  const url = `${PUBLIC_ORIGIN}${route}`;
  const block = sitemap.match(new RegExp(`<url>\\s*<loc>${escapeRegExp(url)}<\\/loc>([\\s\\S]*?)<\\/url>`, 'i'))?.[1] || '';
  return block.match(/<lastmod>([^<]+)<\/lastmod>/i)?.[1] || '';
}

function findStructuredDataEntityViolations(html, relativeFile) {
  const violations = [];
  const productNodes = [];

  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let parsed;
    try {
      parsed = JSON.parse(match[1]);
    } catch {
      continue;
    }

    const roots = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.['@graph']) ? parsed['@graph'] : [parsed];
    for (const root of roots) {
      visitStructuredDataNode(root, (node) => {
        const types = Array.isArray(node?.['@type']) ? node['@type'] : [node?.['@type']].filter(Boolean);
        if (types.includes('Product')) productNodes.push(node);
        if (node?.hasVariant) violations.push(`${relativeFile}: Product.hasVariant must not create incomplete Product entities`);
        if (types.includes('Review') && (!node.author || !node.itemReviewed || !node.reviewRating)) {
          violations.push(`${relativeFile}: incomplete Review used for an external reference`);
        }
        if (types.includes('VideoObject') && (!node.thumbnailUrl || !node.uploadDate || (!node.contentUrl && !node.embedUrl))) {
          violations.push(`${relativeFile}: incomplete VideoObject used for an external reference`);
        }
      });
    }
  }

  const mainProducts = productNodes.filter((node) => /#product$/.test(node?.['@id'] || ''));
  const incompleteProducts = productNodes.filter((node) => !/#product$/.test(node?.['@id'] || ''));
  for (const node of incompleteProducts) {
    violations.push(`${relativeFile}: secondary Product entity must be an @id reference or WebPage (${node.name || node.url || 'unnamed'})`);
  }

  const isProductPage = /^(?:(?:en|ru|da|sv|no|zh)\/)?collection\/[^/]+\/index\.html$/.test(relativeFile)
    && relativeFile !== 'collection/pineau-des-charentes-blanc/index.html';
  if (isProductPage && mainProducts.length !== 1) {
    violations.push(`${relativeFile}: expected exactly one main Product, found ${mainProducts.length}`);
  }
  if (!relativeFile.startsWith('ru/collection/')) {
    for (const product of mainProducts) {
      if (product.offers) violations.push(`${relativeFile}: Product Offer is only allowed on verified Russian partner pages`);
    }
  }

  return violations;
}

function visitStructuredDataNode(value, visitor) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) visitStructuredDataNode(item, visitor);
    return;
  }
  visitor(value);
  for (const child of Object.values(value)) visitStructuredDataNode(child, visitor);
}

function extractPartnerCtaUrls(html) {
  const urls = [];
  for (const match of html.matchAll(/<a\b(?=[^>]*\bclass=["'][^"']*\bbtn-commander-produit\b)[^>]*>/gi)) {
    const href = match[0].match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (href?.startsWith('https://av.ru/')) urls.push(href.replace(/&amp;/g, '&'));
  }
  return urls;
}

function extractMainProductSchema(html, slug) {
  const expectedId = `${PUBLIC_ORIGIN}/ru/collection/${slug}/#product`;
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1]);
      const nodes = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.['@graph']) ? parsed['@graph'] : [parsed];
      const product = nodes.find((node) => node?.['@type'] === 'Product' && node?.['@id'] === expectedId);
      if (product) return product;
    } catch {
      // General JSON-LD syntax checks are handled by the SEO generator; keep this check focused on offers.
    }
  }
  return null;
}

function extractWebPageSchema(html, slug) {
  const expectedId = `${PUBLIC_ORIGIN}/ru/collection/${slug}/#webpage`;
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1]);
      const nodes = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.['@graph']) ? parsed['@graph'] : [parsed];
      const webPage = nodes.find((node) => node?.['@type'] === 'WebPage' && node?.['@id'] === expectedId);
      if (webPage) return webPage;
    } catch {
      // General JSON-LD syntax checks are handled by the SEO generator; keep this check focused on partner actions.
    }
  }
  return null;
}

function findBrandViolations(html, relativeFile) {
  const violations = [];
  for (const { label, value } of extractBrandContexts(html)) {
    const visibleBrandText = stripTechnicalBrandReferences(value);
    for (const match of visibleBrandText.matchAll(/\bCroizet\b/gi)) {
      const before = visibleBrandText.slice(Math.max(0, match.index - 32), match.index);
      if (!/\bLéopold(?:\s|\u00a0)+$/i.test(before)) {
        const start = Math.max(0, match.index - 70);
        const end = Math.min(visibleBrandText.length, match.index + 90);
        const preview = visibleBrandText.slice(start, end).replace(/\s+/g, ' ').trim();
        violations.push(`${relativeFile} (${label}): "${preview}"`);
      }
    }
  }
  return violations;
}

function findCompetitorReferenceViolations(html, relativeFile) {
  const violations = [];
  for (const { label, pattern } of forbiddenCompetitorReferences) {
    for (const match of html.matchAll(pattern)) {
      violations.push(`${relativeFile}: ${label}: ${match[0]}`);
    }
  }
  return violations;
}


function findImageDimensionViolations(html, relativeFile) {
  const violations = [];
  for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
    const src = getAttribute(tag, 'src') || getAttribute(tag, 'data-src');
    if (!src || src.startsWith('data:')) continue;
    if (!/\.(?:png|jpe?g|gif|svg|webp|avif)(?:[?#]|$)/i.test(src)) continue;
    if (!hasAttribute(tag, 'width') || !hasAttribute(tag, 'height')) {
      violations.push(`${relativeFile}: ${src}`);
    }
  }
  return violations;
}

function findMissingImageAltViolations(html, relativeFile) {
  const violations = [];
  for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
    const src = getAttribute(tag, 'src') || getAttribute(tag, 'data-src') || '';
    if (src.startsWith('data:')) continue;
    if (!hasAttribute(tag, 'alt')) {
      violations.push(`${relativeFile}: ${src || tag.slice(0, 120)}`);
    }
  }
  return violations;
}

function findFormLabelViolations(html, relativeFile) {
  const violations = [];
  const labelFors = new Set([...html.matchAll(/<label\b[^>]*\bfor=(["'])([^"']+)\1/gi)].map((match) => match[2]).filter(Boolean));
  const controlPattern = /<(input|select|textarea)\b[^>]*>/gi;
  for (const match of html.matchAll(controlPattern)) {
    const tag = match[0];
    const type = getAttribute(tag, 'type').toLowerCase();
    if (['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) continue;
    if (hasAttribute(tag, 'aria-label') || hasAttribute(tag, 'aria-labelledby') || hasAttribute(tag, 'title')) continue;
    const id = getAttribute(tag, 'id');
    if (id && labelFors.has(id)) continue;
    if (isWrappedByLabel(html, match.index)) continue;
    const name = getAttribute(tag, 'name') || id || tag.slice(0, 80);
    violations.push(`${relativeFile}: ${name}`);
  }
  return violations;
}

function findProductAltViolations(html, relativeFile) {
  const violations = [];
  for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
    const src = getAttribute(tag, 'src') || getAttribute(tag, 'data-src') || '';
    const normalizedSrc = src.split('?')[0];
    const rule = productImageAltRules.find(([pattern]) => pattern.test(normalizedSrc));
    if (!rule) continue;
    const alt = decodeHtml(getAttribute(tag, 'alt'));
    if (!rule[1].test(alt)) violations.push(`${relativeFile}: ${src} alt="${alt}"`);
  }
  return violations;
}

function findHomeMediaViolations(html, relativeFile) {
  if (!['index.html', 'en/index.html', 'ru/index.html', 'da/index.html', 'sv/index.html', 'no/index.html', 'zh/index.html'].includes(relativeFile)) {
    return [];
  }
  const violations = [];
  if (/"lazyLoad":0/.test(html)) violations.push(`${relativeFile}: SmartSlider lazyLoad is disabled`);
  for (const tag of html.match(/<video\b[^>]*>/gi) || []) {
    if (getAttribute(tag, 'preload') !== 'none') violations.push(`${relativeFile}: video preload should be none`);
  }
  return violations;
}

function findLanguageMenuViolations(html, relativeFile) {
  const menu = html.match(/<div\b[^>]*\blc-language-menu\b[\s\S]*?<ul\b[^>]*\blc-language-menu-list\b[^>]*>([\s\S]*?)<\/ul>[\s\S]*?<\/div>/i);
  if (!menu) {
    return hasCompleteLanguageAlternates(html) ? [`${relativeFile}: missing language menu`] : [];
  }

  const violations = [];
  const menuHtml = menu[0];
  const listHtml = menu[1];
  const toggle = menuHtml.match(/<(?:a|button)\b[^>]*\blc-language-menu-toggle\b[^>]*>/i)?.[0] || '';
  if (!toggle) {
    violations.push(`${relativeFile}: missing language menu toggle`);
  } else {
    if (!hasAttribute(toggle, 'aria-label')) violations.push(`${relativeFile}: language menu toggle missing aria-label`);
    if (getAttribute(toggle, 'aria-expanded') !== 'false') violations.push(`${relativeFile}: language menu toggle must default to aria-expanded="false"`);
  }

  const labels = [...listHtml.matchAll(/<span\b[^>]*\bwpml-ls-display\b[^>]*>([\s\S]*?)<\/span>/gi)]
    .map((match) => stripTags(decodeHtml(match[1])).trim());
  if (labels.join('|') !== languageMenuExpectedLabels.join('|')) {
    violations.push(`${relativeFile}: expected language labels "${languageMenuExpectedLabels.join(' | ')}", found "${labels.join(' | ')}"`);
  }

  const anchors = [...listHtml.matchAll(/<a\b[^>]*>/gi)].map((match) => match[0]);
  const hrefLangs = anchors.map((anchor) => getAttribute(anchor, 'hreflang'));
  if (hrefLangs.join('|') !== languageMenuExpectedHreflangs.join('|')) {
    violations.push(`${relativeFile}: expected hreflang order "${languageMenuExpectedHreflangs.join(' | ')}", found "${hrefLangs.join(' | ')}"`);
  }

  const currentItem = listHtml.match(/<li\b[^>]*\bwpml-ls-current-language\b[^>]*>[\s\S]*?<\/li>/i)?.[0] || '';
  if (!currentItem) {
    violations.push(`${relativeFile}: missing current language marker`);
  } else if (!/aria-current=(["'])page\1/i.test(currentItem)) {
    violations.push(`${relativeFile}: current language link missing aria-current="page"`);
  }

  const productSlug = productSlugForRelativeFile(relativeFile);
  if (productSlug && allProductLocaleRoutesExist(productSlug)) {
    const hrefs = new Set(anchors.map((anchor) => normalizeLocalHref(getAttribute(anchor, 'href'))).filter(Boolean));
    for (const lang of siteLanguages) {
      const expected = productRouteForLanguage(lang, productSlug);
      if (!hrefs.has(expected)) violations.push(`${relativeFile}: language menu missing product alternate ${expected}`);
    }
  }

  return violations;
}

function hasCompleteLanguageAlternates(html) {
  return languageMenuExpectedHreflangs.every((hrefLang) => (
    new RegExp(`<link\\b[^>]*\\brel=(["'])alternate\\1[^>]*\\bhreflang=(["'])${escapeRegExp(hrefLang)}\\2`, 'i').test(html)
    || new RegExp(`<link\\b[^>]*\\bhreflang=(["'])${escapeRegExp(hrefLang)}\\1[^>]*\\brel=(["'])alternate\\2`, 'i').test(html)
  ));
}

function isWrappedByLabel(html, index) {
  const open = html.lastIndexOf('<label', index);
  const close = html.lastIndexOf('</label>', index);
  return open > close;
}

function hasAttribute(tag, name) {
  return new RegExp('\\b' + escapeRegExp(name) + '=', 'i').test(tag);
}

function getAttribute(tag, name) {
  const pattern = new RegExp("\\b" + escapeRegExp(name) + "=([\'\\\"])(.*?)\\1", "i");
  return tag.match(pattern)?.[2] || '';
}

function stripTags(value) {
  return String(value).replace(/<[^>]*>/g, ' ');
}

function normalizeLocalHref(href) {
  if (!href) return '';
  let value = decodeHtml(href).split('#')[0].split('?')[0].trim();
  if (!value) return '';
  try {
    const url = new URL(value, PUBLIC_ORIGIN);
    if (url.origin !== PUBLIC_ORIGIN) return '';
    value = url.pathname;
  } catch {
    return '';
  }
  if (DEPLOY_BASE_PATH && value.startsWith(`${DEPLOY_BASE_PATH}/`)) {
    value = value.slice(DEPLOY_BASE_PATH.length);
  }
  return value.endsWith('/') ? value : `${value}/`;
}

function productSlugForRelativeFile(relativeFile) {
  return relativeFile.match(/^(?:(?:en|ru|da|sv|no|zh)\/)?collection\/([^/]+)\/index\.html$/)?.[1] || '';
}

function productRouteForLanguage(lang, slug) {
  return lang === 'fr' ? `/collection/${slug}/` : `/${lang}/collection/${slug}/`;
}

function allProductLocaleRoutesExist(slug) {
  return siteLanguages.every((lang) => localTargetExists(productRouteForLanguage(lang, slug)));
}

function escapeRegExp(value) {
  return String(value).replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

function findPineauRedCollectionViolations(html, relativeFile) {
  const collectionPages = new Set([
    'collection/index.html',
    'en/shop/index.html',
    'ru/a-faire/index.html',
    'da/shop/index.html',
    'sv/shop/index.html',
    'no/shop/index.html',
    'zh/shop/index.html',
  ]);
  if (!collectionPages.has(relativeFile)) return [];

  const violations = [];
  const images = [...html.matchAll(/<img\b[^>]*>/gi)]
    .map((match) => match[0])
    .filter((image) => /pineau-des-charentes-rouge|Pineau Rouge/i.test(image));
  if (images.length === 0) {
    return [`${relativeFile}: missing Pineau Rouge collection thumbnail image`];
  }

  for (const image of images) {
    if (!/src=["'][^"']*\/pineau-des-charentes-rouge\.png["']/i.test(image)) {
      violations.push(`${relativeFile}: Pineau Rouge collection card must use pineau-des-charentes-rouge.png as src`);
    }
    if (/pineau-des-charentes-rouge-\d+x\d+\.png/i.test(image)) {
      violations.push(`${relativeFile}: Pineau Rouge collection card must not use a resized derivative in src or srcset`);
    }
    if (/\ssrcset=/i.test(image)) {
      violations.push(`${relativeFile}: Pineau Rouge collection card must not use a srcset`);
    }
  }

  return violations;
}

function findCollectionEndPageLayoutViolations(html, relativeFile) {
  const collectionPages = new Set([
    'collection/index.html',
    'en/shop/index.html',
    'ru/a-faire/index.html',
    'da/shop/index.html',
    'sv/shop/index.html',
    'no/shop/index.html',
    'zh/shop/index.html',
  ]);
  if (!collectionPages.has(relativeFile)) return [];

  const block = html.match(/<div class="end-page">[\s\S]*?(?=\s*<footer\b)/i)?.[0];
  if (!block) return [`${relativeFile}: missing collection end-page block`];

  const cardStarts = [...block.matchAll(/<div class="container-collection-produit">/g)];
  const violations = [];
  if (cardStarts.length !== 3) {
    violations.push(`${relativeFile}: expected 3 end-page collection cards, found ${cardStarts.length}`);
  }

  for (let index = 0; index < cardStarts.length - 1; index++) {
    const segment = block.slice(cardStarts[index].index, cardStarts[index + 1].index);
    if (divDepth(segment) !== 0) {
      violations.push(`${relativeFile}: collection card ${index + 1} is not closed before the next card`);
    }
  }

  return violations;
}

function divDepth(html) {
  let depth = 0;
  for (const token of html.match(/<\/?div\b[^>]*>/gi) || []) {
    depth += token.startsWith('</') ? -1 : 1;
  }
  return depth;
}

function findPineauRedProductNavigationViolations(html, relativeFile) {
  if (!/^(?:[a-z]{2}\/)?collection\/[^/]+\/index\.html$/.test(relativeFile)) return [];
  if (!html.includes('bas-page-produit')) return [];

  const violations = [];
  const whiteBlocks = productNavigationBlocks(html, 'pineau-des-charentes');
  const redBlocks = productNavigationBlocks(html, 'pineau-des-charentes-rouge');

  if (whiteBlocks.length === 0) {
    violations.push(`${relativeFile}: missing Pineau Blanc product navigation thumbnail`);
  }
  if (redBlocks.length === 0) {
    violations.push(`${relativeFile}: missing Pineau Rouge product navigation thumbnail`);
  }

  for (const block of whiteBlocks) {
    if (!/src=["'][^"']*\/img_produit_pineau_base-1\.png["']/i.test(block)) {
      violations.push(`${relativeFile}: Pineau Blanc product navigation must use img_produit_pineau_base-1.png as src`);
    }
    if (!/<div class="titre-produit">\s*Pineau Blanc\s*<\/div>/i.test(block)) {
      violations.push(`${relativeFile}: Pineau Blanc product navigation title must be Pineau Blanc`);
    }
  }

  for (const block of redBlocks) {
    if (!/src=["'][^"']*\/pineau-des-charentes-rouge\.png["']/i.test(block)) {
      violations.push(`${relativeFile}: Pineau Rouge product navigation must use pineau-des-charentes-rouge.png as src`);
    }
    if (/pineau-des-charentes-rouge-\d+x\d+\.png/i.test(block)) {
      violations.push(`${relativeFile}: Pineau Rouge product navigation must not use a resized derivative`);
    }
    if (!/<div class="titre-produit">\s*Pineau Rouge\s*<\/div>/i.test(block)) {
      violations.push(`${relativeFile}: Pineau Rouge product navigation title must be Pineau Rouge`);
    }
  }

  return violations;
}

function productNavigationBlocks(html, slug) {
  const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `<div class="produit-unique bas-page-produit">\\s*<a href="[^"]*/collection/${escapedSlug}/"[\\s\\S]*?</a>\\s*</div>`,
    'gi',
  );
  return [...html.matchAll(pattern)].map((match) => match[0]);
}

function extractBrandContexts(html) {
  const contexts = [];

  for (const [, value] of html.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)) {
    contexts.push({ label: 'title', value: decodeHtml(value) });
  }

  for (const [, name, value] of html.matchAll(/\b(alt|title|aria-label|content)=["']([^"']*Croizet[^"']*)["']/gi)) {
    if (/^https?:\/\//i.test(value) || value.includes('/')) continue;
    contexts.push({ label: name, value: decodeHtml(value) });
  }

  const visibleText = decodeHtml(
    html
      .replace(/<head[\s\S]*?<\/head>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' ')
  );
  contexts.push({ label: 'visible text', value: visibleText });

  return contexts.filter((context) => /\bCroizet\b/i.test(context.value));
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;|&#160;/gi, '\u00a0')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#([0-9]+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function stripTechnicalBrandReferences(value) {
  return value
    .replace(/\bCognac[\s\u00a0]+Pierre[\s\u00a0]+Croizet\b/gi, 'Cognac legacy name')
    .replace(/\bMaison[\s\u00a0]+Pierre[\s\u00a0]+Croizet\b/gi, 'Maison legacy name')
    .replace(/\bhttps?:\/\/\S*croizet\S*/gi, ' ')
    .replace(/\bwww\.\S*croizet\S*/gi, ' ')
    .replace(/\b\S*@\S*croizet\S*/gi, ' ')
    .replace(/\b(?:[\w-]*croizet[\w-]*\.)+[\w.-]+/gi, ' ')
    .replace(/\b\S*[-_/]\S*croizet\S*\b/gi, ' ');
}
