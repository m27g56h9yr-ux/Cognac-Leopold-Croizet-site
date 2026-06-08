import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_ORIGIN = 'https://cognac-leopold-croizet.com';

const SITEMAP_INDEXES = [
  'https://cognac-leopold-croizet.com/wp-sitemap.xml',
  'https://en.cognac-leopold-croizet.com/wp-sitemap.xml',
  'https://ru.cognac-leopold-croizet.com/wp-sitemap.xml',
];

const HOST_PREFIX = new Map([
  ['cognac-leopold-croizet.com', ''],
  ['www.cognac-leopold-croizet.com', ''],
  ['leopold-croizet.com', ''],
  ['www.leopold-croizet.com', ''],
  ['en.cognac-leopold-croizet.com', '/en'],
  ['ru.cognac-leopold-croizet.com', '/ru'],
]);

const CDN_ASSET_HOSTS = new Set([
  'use.fontawesome.com',
  'stackpath.bootstrapcdn.com',
  'maxcdn.bootstrapcdn.com',
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
]);

const ASSET_EXTENSIONS = new Set([
  '.avif',
  '.css',
  '.eot',
  '.gif',
  '.ico',
  '.jpeg',
  '.jpg',
  '.js',
  '.json',
  '.mp4',
  '.otf',
  '.png',
  '.svg',
  '.ttf',
  '.webm',
  '.webp',
  '.woff',
  '.woff2',
]);

const GENERATED_TOP_LEVEL = [
  'assets',
  'categorie-produit',
  'collection',
  'commander',
  'en',
  'heritage',
  'lalchimie',
  'la-matiere',
  'le-feu',
  'le-temps',
  'leopold-croizet',
  'mentions-legales',
  'mon-compte',
  'panier',
  'pierre-croizet-cocktails',
  'rencontre',
  'ru',
  'wp-content',
  'wp-includes',
];

const GENERATED_FILES = [
  'index.html',
  'llms.txt',
  'robots.txt',
  'sitemap.xml',
  'site.webmanifest',
];

const assetQueue = [];
const queuedAssets = new Set();
const fetchedAssets = new Set();
const pageRecords = [];
const pageUrls = new Set();
const failedAssets = [];

await main();

async function main() {
  await cleanGeneratedFiles();
  const urls = await collectSitemapUrls();

  for (const pageUrl of urls) {
    await buildPage(pageUrl);
  }

  while (assetQueue.length > 0) {
    const next = assetQueue.shift();
    await fetchAsset(next.url, next.referer);
  }

  await writeGlobalFiles();

  console.log(`Generated ${pageRecords.length} pages`);
  console.log(`Localized ${fetchedAssets.size} assets`);
  if (failedAssets.length > 0) {
    console.log(`Skipped ${failedAssets.length} assets that did not respond cleanly`);
  }
}

async function cleanGeneratedFiles() {
  for (const entry of GENERATED_TOP_LEVEL) {
    await rm(path.join(ROOT, entry), { recursive: true, force: true });
  }
  for (const file of GENERATED_FILES) {
    await rm(path.join(ROOT, file), { force: true });
  }
}

async function collectSitemapUrls() {
  const sitemapUrls = new Set();
  const urls = new Set();

  for (const indexUrl of SITEMAP_INDEXES) {
    const xml = await fetchText(indexUrl);
    for (const loc of extractLocs(xml)) {
      sitemapUrls.add(loc);
    }
  }

  for (const sitemapUrl of sitemapUrls) {
    const xml = await fetchText(sitemapUrl);
    for (const loc of extractLocs(xml)) {
      const url = normalizeAbsoluteUrl(loc);
      if (!url) continue;
      if (!HOST_PREFIX.has(url.hostname)) continue;
      urls.add(stripHash(url).toString());
    }
  }

  const sortedUrls = [...urls].sort((a, b) => {
    const hostOrder = hostRank(new URL(a).hostname) - hostRank(new URL(b).hostname);
    if (hostOrder !== 0) return hostOrder;
    return new URL(a).pathname.localeCompare(new URL(b).pathname);
  });

  for (const pageUrl of sortedUrls) {
    pageUrls.add(pageUrl.replace(/\/$/, ''));
  }

  return sortedUrls;
}

function hostRank(hostname) {
  if (hostname.startsWith('en.')) return 1;
  if (hostname.startsWith('ru.')) return 2;
  return 0;
}

async function buildPage(pageUrl) {
  const response = await fetch(pageUrl, {
    headers: { 'user-agent': 'Codex static preservation bot' },
  });
  if (!response.ok) {
    throw new Error(`Unable to fetch ${pageUrl}: ${response.status}`);
  }

  const originalHtml = await response.text();
  const targetPath = pagePathForUrl(new URL(pageUrl));
  const pageDir = path.dirname(targetPath);
  const route = routeForPagePath(targetPath);
  const originalAlternates = extractAlternates(originalHtml);

  let html = repairKnownBrokenAssets(stripDynamicWordPressNoise(originalHtml));
  collectAssets(html, pageUrl);
  html = rewriteHtmlUrls(html, pageUrl);
  html = enhanceSeo(html, {
    pageUrl,
    route,
    alternates: originalAlternates,
  });

  await writeText(targetPath, html);

  pageRecords.push({
    source: pageUrl,
    route,
    targetPath,
    title: extractTitle(html),
    description: extractMetaDescription(html),
  });

  console.log(`Page ${route}`);

  if (pageDir !== '.') {
    await mkdir(path.join(ROOT, pageDir), { recursive: true });
  }
}

function stripDynamicWordPressNoise(html) {
  return html
    .replace(/<link[^>]+rel=["']profile["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+rel=["']pingback["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+rel=["']dns-prefetch["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+type=["']application\/rss\+xml["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+rel=["']https:\/\/api\.w\.org\/["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+rel=["']EditURI["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+title=["']JSON["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+title=["']oEmbed[^>]+>\s*/gi, '')
    .replace(/<script[^>]+kit\.fontawesome\.com\/[^>]*><\/script>\s*/gi, '')
    .replace(/<script[^>]+id=["']sourcebuster-js-js["'][\s\S]*?<\/script>\s*/gi, '')
    .replace(/<script[^>]+id=["']wpml-cookie-js-extra["'][\s\S]*?<\/script>\s*/gi, '')
    .replace(/<script[^>]+id=["']wc-order-attribution-js["'][\s\S]*?<\/script>\s*/gi, '')
    .replace(/<script[^>]+id=["']wc-order-attribution-js-extra["'][\s\S]*?<\/script>\s*/gi, '')
    .replace(/<script[^>]+id=["']cart-widget-js["'][\s\S]*?<\/script>\s*/gi, '')
    .replace(/<script[^>]+id=["']cart-widget-js-extra["'][\s\S]*?<\/script>\s*/gi, '')
    .replace(/<script[^>]+id=["']wpml-cookie-js["'][\s\S]*?<\/script>\s*/gi, '')
    .replace(/<script[^>]+id=["'](?:woocommerce-js-extra|woocommerce-js|jquery-blockui-js|js-cookie-js)["'][\s\S]*?<\/script>\s*/gi, '')
    .replace(/<script[^>]+id=["'](?:wc-cart-js-extra|wc-cart-js|wc-checkout-js-extra|wc-checkout-js|wc-country-select-js-extra|wc-country-select-js|wc-address-i18n-js-extra|wc-address-i18n-js)["'][\s\S]*?<\/script>\s*/gi, '')
    .replace(/<script[^>]+id=["'](?:wpml-browser-redirect-js-extra|wpml-browser-redirect-js|wpml-xdomain-data-js-extra|wpml-xdomain-data-js)["'][\s\S]*?<\/script>\s*/gi, '')
    .replace(/<script[^>]+id=["'](?:modal-js-extra|panier-js-extra)["'][\s\S]*?<\/script>\s*/gi, '')
    .replace(/<script[^>]+type=["']speculationrules["'][\s\S]*?<\/script>\s*/gi, '')
    .replace(/<script[^>]+id=["']wp-emoji-settings["'][\s\S]*?<\/script>\s*/gi, '')
    .replace(/<style[^>]+id=["']wp-emoji-styles-inline-css["'][\s\S]*?<\/style>\s*/gi, '')
    .replace(/<script type=["']module["'][\s\S]*?wpEmojiSettingsSupports[\s\S]*?<\/script>\s*/gi, '')
    .replace(/<script[^>]+src=["'][^"']*wp-emoji-release[^"']*["'][^>]*><\/script>\s*/gi, '');
}

function repairKnownBrokenAssets(html) {
  return html
    .replace(/https?:\/wp-content/gi, '/wp-content')
    .replace(/https?:\\\/wp-content/gi, '/wp-content')
    .replace(/\/wp-content\/uploads\/2021\/12\/cropped-favicon_512-(?:32x32|180x180|192x192|270x270)\.png/gi, '/wp-content/uploads/2021/10/logo_croizet_blason.svg')
    .replace(/https:\/wp-content\/uploads\/2021\/12\/cropped-favicon_512-(?:32x32|180x180|192x192|270x270)\.png/gi, '/wp-content/uploads/2021/10/logo_croizet_blason.svg')
    .replace(/\/wp-content\/uploads\/2021\/06\/domaine-pierre-croizet\.jpg/gi, '/wp-content/uploads/2022/02/propriete_02-scaled.jpg')
    .replace(/\/wp-content\/uploads\/2021\/11\/Sparks12-1\.mp4/gi, '/wp-content/uploads/2021/11/Sparks12.mp4')
    .replace(/\/wp-content\/uploads\/2021\/10\/distillation_compress\.mp4/gi, '/wp-content/uploads/2021/11/distillation_compress-1.mp4')
    .replace(/\/wp-content\/uploads\/2021\/12\/video_le-vieillissement_mobile\.mp4/gi, '/wp-content/uploads/2021/11/video_le-vieillissement_mobile.mp4')
    .replace(/\/wp-content\/uploads\/2021\/12\/propriete-scaled-e1638897046384\.jpg/gi, '/wp-content/uploads/2022/02/propriete_02-scaled.jpg')
    .replace(/\/wp-content\/uploads\/2021\/12\/contact-2-e1638897169480\.png/gi, '/wp-content/uploads/2021/12/contact.png')
    .replace(/\/wp-content\/uploads\/2021\/11\/img_archive_divers-actes_mob-1\.jpg/gi, '/wp-content/uploads/2024/03/img_archive_divers-actes_mob.jpg')
    .replace(/\/wp-content\/uploads\/2021\/11\/img_archive_jeanmarc-fouche%CC%81_mobile\.jpg/gi, '/wp-content/uploads/2024/03/img_archive_jeanmarc-fouche_mobile-1.jpg')
    .replace(/\/wp-content\/uploads\/2021\/12\/signature_leopold_croizet(?:-[^"'\s,]+)?\.png/gi, '/wp-content/uploads/2024/03/logo_leopold_croizet_footer_02.svg')
    .replace(/\/mon-compte\/lost-password\//gi, '/mon-compte/')
    .replace(/\/en\/my-account\/lost-password\//gi, '/en/my-account/')
    .replace(/\/ru\/mon-compte-2\/lost-password\//gi, '/ru/mon-compte-2/');
}

function rewriteHtmlUrls(html, baseUrl) {
  let rewritten = html.replace(/\s(?:integrity|crossorigin)=["'][^"']*["']/gi, '');

  rewritten = rewritten.replace(
    /(srcset|data-srcset)=["']([^"']+)["']/gi,
    (full, attr, value) => `${attr}="${rewriteSrcset(value, baseUrl)}"`,
  );

  rewritten = rewritten.replace(
    /(href|src|poster|action|data-src|data-background|data-bg|data-image|data-lazy-src)=["']([^"']*)["']/gi,
    (full, attr, value) => `${attr}="${rewriteUrl(value, baseUrl)}"`,
  );

  rewritten = rewriteCssUrls(rewritten, baseUrl);

  return rewritten.replace(
    /(?<!["'=])((?:https?:)?\/\/(?:cognac-leopold-croizet\.com|www\.cognac-leopold-croizet\.com|leopold-croizet\.com|www\.leopold-croizet\.com|en\.cognac-leopold-croizet\.com|ru\.cognac-leopold-croizet\.com)\/[^\s"'<>),]+)/gi,
    (url) => rewriteUrl(url, baseUrl),
  ).replace(
    /https:\\\/\\\/(cognac-leopold-croizet\.com|www\.cognac-leopold-croizet\.com|leopold-croizet\.com|www\.leopold-croizet\.com|en\.cognac-leopold-croizet\.com|ru\.cognac-leopold-croizet\.com)((?:\\\/)[^"']+)/gi,
    (full, host, escapedPath) => {
      const absolute = `https://${host}${escapedPath.replace(/\\\//g, '/')}`;
      const rewrittenUrl = rewriteUrl(absolute, baseUrl);
      return rewrittenUrl.replace(/\//g, '\\/');
    },
  );
}

function rewriteSrcset(value, baseUrl) {
  return value
    .split(',')
    .map((candidate) => {
      const trimmed = candidate.trim();
      if (!trimmed) return trimmed;
      const [url, ...descriptor] = trimmed.split(/\s+/);
      return [rewriteUrl(url, baseUrl), ...descriptor].join(' ');
    })
    .join(', ');
}

function rewriteCssUrls(text, baseUrl) {
  return text.replace(/url\((['"]?)([^'")]+)\1\)/gi, (full, quote, raw) => {
    const value = raw.trim();
    if (!value || value.startsWith('data:') || value.startsWith('#')) return full;
    const rewritten = rewriteUrl(value, baseUrl, { css: true });
    return `url(${quote}${rewritten}${quote})`;
  });
}

function rewriteUrl(value, baseUrl, options = {}) {
  const original = decodeHtmlEntities(value.trim());
  if (!original || original.startsWith('#') || original.startsWith('mailto:') || original.startsWith('tel:')) {
    return value;
  }

  let url;
  try {
    url = normalizeAbsoluteUrl(original, baseUrl);
  } catch {
    return value;
  }

  if (!url) return value;
  url = stripHash(url);

  if (isLocalizableAsset(url)) {
    queueAsset(url, baseUrl);
    return `/${assetPathForUrl(url)}`;
  }

  if (HOST_PREFIX.has(url.hostname)) {
    return pageHrefForUrl(url);
  }

  if (options.css) return original;
  return value;
}

function enhanceSeo(html, page) {
  const title = makeTitle(html, page);
  const description = makeDescription(html);
  const canonical = `${PUBLIC_ORIGIN}${page.route}`;
  const ogImage = firstImage(html);
  const lang = languageForRoute(page.route);
  const alternates = makeAlternateLinks(page.alternates, page.route);

  let enhanced = html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+name=["']description["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+name=["']robots["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+rel=["']alternate["'][^>]+hreflang=["'][^"']+["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+hreflang=["'][^"']+["'][^>]+rel=["']alternate["'][^>]*>\s*/gi, '');

  if (/<html[^>]*lang=/i.test(enhanced)) {
    enhanced = enhanced.replace(/<html([^>]*)lang=["'][^"']*["']([^>]*)>/i, `<html$1lang="${lang}"$2>`);
  }

  const seoBlock = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}">`,
    '<meta name="robots" content="index, follow, max-image-preview:large">',
    `<link rel="canonical" href="${canonical}">`,
    ...alternates,
    `<meta property="og:type" content="${page.route.includes('/collection/') ? 'product' : 'website'}">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${canonical}">`,
    ogImage ? `<meta property="og:image" content="${PUBLIC_ORIGIN}${ogImage}">` : '',
    '<meta name="twitter:card" content="summary_large_image">',
    '<link rel="preload" href="/wp-content/themes/theme-site-pc/style.css" as="style">',
  ]
    .filter(Boolean)
    .join('\n');

  enhanced = enhanced.replace(/<head([^>]*)>/i, `<head$1>\n${seoBlock}`);

  const schema = organizationSchema(page.route);
  enhanced = enhanced.replace(/<\/head>/i, `${schema}\n</head>`);

  return enhanced;
}

function makeAlternateLinks(alternates, fallbackRoute) {
  const links = [];
  const seen = new Set();

  for (const alternate of alternates) {
    const url = normalizeAbsoluteUrl(alternate.href);
    if (!url || !HOST_PREFIX.has(url.hostname)) continue;
    const href = `${PUBLIC_ORIGIN}${pageHrefForUrl(url)}`;
    const key = `${alternate.lang}:${href}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push(`<link rel="alternate" hreflang="${alternate.lang}" href="${href}">`);
  }

  if (links.length === 0) {
    links.push(`<link rel="alternate" hreflang="x-default" href="${PUBLIC_ORIGIN}${fallbackRoute}">`);
  }

  return links;
}

function organizationSchema(route) {
  const base = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Cognac Léopold Croizet',
    url: PUBLIC_ORIGIN,
    logo: `${PUBLIC_ORIGIN}/wp-content/uploads/2024/03/logo_leopold_croizet_footer_02.svg`,
    email: 'cognac@mdpierre.com',
    telephone: '+33545358810',
    address: {
      '@type': 'PostalAddress',
      streetAddress: "30 Route d'Angoulême",
      postalCode: '16200',
      addressLocality: 'Triac-Lautrait',
      addressCountry: 'FR',
    },
    sameAs: ['https://www.facebook.com/leopold.croizet.cognac'],
  };

  const scripts = [
    `<script type="application/ld+json">${JSON.stringify(base)}</script>`,
  ];

  if (route === '/') {
    scripts.push(
      `<script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Cognac Léopold Croizet',
        url: PUBLIC_ORIGIN,
        inLanguage: ['fr', 'en', 'ru'],
      })}</script>`,
    );
  }

  return scripts.join('\n');
}

function makeTitle(html, page) {
  const h1 = stripTags(matchFirst(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i));
  const sourcePath = new URL(page.pageUrl).pathname;
  const fallback = sourcePath === '/' ? 'Cognac Léopold Croizet' : labelFromPath(sourcePath);
  const title = h1 || fallback;
  if (/léopold croizet/i.test(title)) return normalizeSpaces(title);
  return `${normalizeSpaces(title)} | Cognac Léopold Croizet`;
}

function makeDescription(html) {
  const current = extractMetaDescription(html);
  if (current) return current;

  const text = normalizeSpaces(stripTags(html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')));
  return truncate(text, 160);
}

function extractTitle(html) {
  return stripTags(matchFirst(html, /<title>([\s\S]*?)<\/title>/i));
}

function extractMetaDescription(html) {
  const description = matchFirst(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["'][^>]*>/i)
    || matchFirst(html, /<meta\s+content=["']([^"']*)["']\s+name=["']description["'][^>]*>/i);
  return decodeHtmlEntities(description || '');
}

function firstImage(html) {
  const src = matchFirst(html, /<img\b[^>]+src=["']([^"']+)["']/i);
  if (!src || !src.startsWith('/')) return '';
  return src;
}

function languageForRoute(route) {
  if (route.startsWith('/en/')) return 'en';
  if (route.startsWith('/ru/')) return 'ru';
  return 'fr';
}

function extractAlternates(html) {
  const alternates = [];
  const linkRegex = /<link\b[^>]*rel=["']alternate["'][^>]*>/gi;
  for (const [tag] of html.matchAll(linkRegex)) {
    const lang = matchFirst(tag, /hreflang=["']([^"']+)["']/i);
    const href = matchFirst(tag, /href=["']([^"']+)["']/i);
    if (lang && href) alternates.push({ lang, href: decodeHtmlEntities(href) });
  }
  return alternates;
}

function collectAssets(text, baseUrl) {
  const urls = new Set();

  const attrRegex = /\b(?:href|src|poster|data-src|data-background|data-bg|data-image|data-lazy-src)=["']([^"']+)["']/gi;
  for (const [, raw] of text.matchAll(attrRegex)) {
    urls.add(raw);
  }

  const srcsetRegex = /\b(?:srcset|data-srcset)=["']([^"']+)["']/gi;
  for (const [, raw] of text.matchAll(srcsetRegex)) {
    for (const part of raw.split(',')) {
      const candidate = part.trim().split(/\s+/)[0];
      if (candidate) urls.add(candidate);
    }
  }

  const cssUrlRegex = /url\((['"]?)([^'")]+)\1\)/gi;
  for (const [, , raw] of text.matchAll(cssUrlRegex)) {
    urls.add(raw);
  }

  const absoluteRegex = /(?:https?:)?\/\/(?:cognac-leopold-croizet\.com|www\.cognac-leopold-croizet\.com|leopold-croizet\.com|www\.leopold-croizet\.com|en\.cognac-leopold-croizet\.com|ru\.cognac-leopold-croizet\.com|use\.fontawesome\.com|stackpath\.bootstrapcdn\.com|maxcdn\.bootstrapcdn\.com|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\/[^\s"'<>),]+/gi;
  for (const [raw] of text.matchAll(absoluteRegex)) {
    urls.add(raw);
  }

  for (const raw of urls) {
    const url = normalizeAbsoluteUrl(decodeHtmlEntities(raw), baseUrl);
    if (url && isLocalizableAsset(url)) {
      queueAsset(url, baseUrl);
    }
  }
}

function queueAsset(url, referer) {
  const key = stripHash(url).toString();
  if (queuedAssets.has(key) || fetchedAssets.has(key)) return;
  queuedAssets.add(key);
  assetQueue.push({ url: stripHash(url), referer });
}

async function fetchAsset(url, referer) {
  const key = url.toString();
  if (fetchedAssets.has(key)) return;

  try {
    const response = await fetch(url, {
      headers: {
        referer,
        'user-agent': 'Codex static preservation bot',
      },
    });

    if (!response.ok) {
      failedAssets.push({ url: key, status: response.status });
      return;
    }

    const localPath = assetPathForUrl(url);
    const contentType = response.headers.get('content-type') || '';
    let body;

    if (contentType.includes('text/css') || localPath.endsWith('.css')) {
      body = await response.text();
      collectAssets(body, url.toString());
      body = rewriteCssUrls(body, url.toString());
      await writeText(localPath, body);
    } else if (contentType.includes('javascript') || localPath.endsWith('.js')) {
      body = await response.text();
      body = repairScriptAsset(body, localPath);
      collectAssets(body, url.toString());
      await writeText(localPath, body);
    } else {
      const buffer = Buffer.from(await response.arrayBuffer());
      await writeBinary(localPath, buffer);
    }

    fetchedAssets.add(key);
    console.log(`Asset /${localPath}`);
  } catch (error) {
    failedAssets.push({ url: key, error: error.message });
  }
}

function repairScriptAsset(body, localPath) {
  if (localPath === 'wp-content/themes/theme-site-pc/js/modal.js') {
    return `$(document).ready(function () {
    $("#age-legal").modal({
        escapeClose: false,
        clickClose: false,
        showClose: false
    });

    $("#form-age-legal").on("submit", function (event) {
        event.preventDefault();
        $.modal.close();
    });
});
`;
  }

  if (localPath === 'wp-content/themes/theme-site-pc/js/panier.js') {
    return body.replace(
      /https:\/\/cognac-leopold-croizet\.com\/wp-content\/uploads\/2022\/01\/panier\.svg/g,
      '/wp-content/uploads/2022/01/panier.svg',
    );
  }

  return body;
}

async function writeGlobalFiles() {
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...pageRecords.map((page) => `  <url><loc>${PUBLIC_ORIGIN}${page.route}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');

  const robots = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${PUBLIC_ORIGIN}/sitemap.xml`,
    '',
  ].join('\n');

  const manifest = {
    name: 'Cognac Léopold Croizet',
    short_name: 'Léopold Croizet',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b0b0b',
    theme_color: '#0b0b0b',
    lang: 'fr',
  };

  const llms = makeLlmsTxt(pageRecords);

  await writeText('sitemap.xml', sitemap);
  await writeText('robots.txt', robots);
  await writeText('site.webmanifest', `${JSON.stringify(manifest, null, 2)}\n`);
  await writeText('llms.txt', llms);
}

function makeLlmsTxt(records) {
  const byLang = {
    fr: records.filter((page) => !page.route.startsWith('/en/') && !page.route.startsWith('/ru/')),
    en: records.filter((page) => page.route.startsWith('/en/')),
    ru: records.filter((page) => page.route.startsWith('/ru/')),
  };

  const section = (title, pages) => [
    `## ${title}`,
    ...pages.map((page) => `- ${PUBLIC_ORIGIN}${page.route} - ${page.title || page.route}`),
    '',
  ].join('\n');

  return [
    '# Cognac Léopold Croizet',
    '',
    'Family-owned Cognac house in Triac-Lautrait, France, producing Fins Bois cognacs from organic vineyard work, distillation, ageing and blending know-how.',
    '',
    'Contact: cognac@mdpierre.com, +33 5 45 35 88 10, 30 Route d’Angoulême, 16200 Triac-Lautrait, France.',
    '',
    section('French pages', byLang.fr),
    section('English pages', byLang.en),
    section('Russian pages', byLang.ru),
  ].join('\n');
}

function isLocalizableAsset(url) {
  const ext = extensionForUrl(url);
  if (CDN_ASSET_HOSTS.has(url.hostname)) return true;
  if (!HOST_PREFIX.has(url.hostname)) return false;

  if (url.pathname.includes('/wp-content/') || url.pathname.includes('/wp-includes/')) {
    return ASSET_EXTENSIONS.has(ext) || ext === '';
  }

  return ASSET_EXTENSIONS.has(ext);
}

function assetPathForUrl(url) {
  const normalized = normalizeAssetUrl(url);
  const ext = extensionForUrl(normalized);

  if (HOST_PREFIX.has(normalized.hostname)) {
    let pathname = safePathname(normalized.pathname);
    if (pathname.startsWith('/')) pathname = pathname.slice(1);
    if (!pathname) pathname = `assets/internal/${hashUrl(normalized)}.bin`;
    return pathname;
  }

  const baseDir = `assets/external/${normalized.hostname}`;
  const cleanPath = safePathname(normalized.pathname).replace(/^\/+/, '');
  const queryHash = normalized.search ? `-${hashUrl(normalized).slice(0, 8)}` : '';

  if (!cleanPath || cleanPath.endsWith('/')) {
    return `${baseDir}/${cleanPath}index${queryHash}${extensionFromHost(normalized.hostname)}`;
  }

  const parsed = path.posix.parse(cleanPath);
  const inferredExt = ext || extensionFromHost(normalized.hostname);
  const filename = ext
    ? `${parsed.name}${queryHash}${parsed.ext}`
    : `${parsed.base}${queryHash}${inferredExt}`;

  return `${baseDir}/${parsed.dir ? `${parsed.dir}/` : ''}${filename}`;
}

function normalizeAssetUrl(url) {
  const normalized = new URL(url.toString());
  if (normalized.hostname === 'leopold-croizet.com' || normalized.hostname === 'www.leopold-croizet.com') {
    normalized.hostname = 'cognac-leopold-croizet.com';
  }
  return normalized;
}

function extensionFromHost(hostname) {
  if (hostname === 'fonts.googleapis.com') return '.css';
  return '.bin';
}

function extensionForUrl(url) {
  return path.posix.extname(url.pathname).toLowerCase();
}

function pagePathForUrl(url) {
  const prefix = HOST_PREFIX.get(url.hostname) || '';
  const pathname = normalizePagePath(url.pathname);
  const localPath = `${prefix}${pathname}`;

  if (localPath === '/' || localPath === '') return 'index.html';
  return `${localPath.replace(/^\/+/, '').replace(/\/$/, '')}/index.html`;
}

function pageHrefForUrl(url) {
  const prefix = HOST_PREFIX.get(url.hostname) || '';
  const pathname = normalizePagePath(url.pathname);
  const href = `${prefix}${pathname}`;
  return href === '' ? '/' : href;
}

function routeForPagePath(pagePath) {
  if (pagePath === 'index.html') return '/';
  return `/${pagePath.replace(/\/index\.html$/, '/')}`;
}

function normalizePagePath(pathname) {
  if (!pathname || pathname === '/') return '/';
  return `/${pathname.replace(/^\/+/, '').replace(/\/?$/, '/')}`;
}

function normalizeAbsoluteUrl(value, baseUrl = undefined) {
  if (!value || value.startsWith('data:') || value.startsWith('blob:')) return null;
  const normalized = value.startsWith('//') ? `https:${value}` : value;
  try {
    return baseUrl ? new URL(normalized, baseUrl) : new URL(normalized);
  } catch {
    return null;
  }
}

function stripHash(url) {
  const stripped = new URL(url.toString());
  stripped.hash = '';
  return stripped;
}

function safePathname(pathname) {
  return decodeURI(pathname)
    .split('/')
    .map((segment) => encodeURIComponent(segment).replace(/%20/g, '-'))
    .join('/');
}

function extractLocs(xml) {
  const locs = [];
  for (const [, loc] of xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)) {
    locs.push(decodeHtmlEntities(loc.trim()));
  }
  return locs;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'Codex static preservation bot' },
  });
  if (!response.ok) {
    throw new Error(`Unable to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

async function writeText(localPath, text) {
  const target = path.join(ROOT, localPath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, text, 'utf8');
}

async function writeBinary(localPath, buffer) {
  const target = path.join(ROOT, localPath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);
}

function hashUrl(url) {
  return createHash('sha1').update(url.toString()).digest('hex');
}

function matchFirst(text, regex) {
  const match = text.match(regex);
  return match ? match[1] : '';
}

function stripTags(value) {
  return decodeHtmlEntities(String(value || '').replace(/<[^>]+>/g, ''));
}

function normalizeSpaces(value) {
  return decodeHtmlEntities(String(value || '')).replace(/\s+/g, ' ').trim();
}

function truncate(value, max) {
  const normalized = normalizeSpaces(value);
  if (normalized.length <= max) return normalized;
  const clipped = normalized.slice(0, max - 1);
  return `${clipped.slice(0, clipped.lastIndexOf(' ') || clipped.length)}…`;
}

function labelFromPath(pathname) {
  return pathname
    .replace(/^\/|\/$/g, '')
    .split('/')
    .filter(Boolean)
    .pop()
    ?.replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Cognac Léopold Croizet';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

// A tiny smoke check used by `node scripts/build-static-site.mjs --check` in CI-like contexts.
if (process.argv.includes('--check')) {
  await readFile(path.join(ROOT, 'index.html'), 'utf8');
}
