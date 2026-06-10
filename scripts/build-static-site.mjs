import { createHash } from 'node:crypto';
import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STATIC_ASSETS_DIR = path.join(ROOT, 'static-assets');
const PUBLIC_ORIGIN = 'https://cognac-leopold-croizet.com';
const DEPLOY_BASE_PATH = '/Cognac-Leopold-Croizet-site';
const STATIC_ASSET_VERSION = 'ru-lang-20260609';
const GOOGLE_MAP_EMBED_URL = 'https://www.google.com/maps?q=30%20Route%20d%27Angoul%C3%AAme%2C%2016200%20Triac-Lautrait%2C%20France&z=13&output=embed';

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
  ['da.cognac-leopold-croizet.com', '/da'],
  ['sv.cognac-leopold-croizet.com', '/sv'],
  ['no.cognac-leopold-croizet.com', '/no'],
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

const EXCLUDED_PAGE_ROUTES = new Set([
  '/heritage/',
  '/en/heritage/',
  '/ru/heritage/',
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

  await copyStaticAssets();
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

async function copyStaticAssets() {
  try {
    await access(STATIC_ASSETS_DIR);
  } catch {
    return;
  }
  await cp(STATIC_ASSETS_DIR, ROOT, { recursive: true, force: true });
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
      if (EXCLUDED_PAGE_ROUTES.has(toLocalRoute(url))) continue;
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
  html = removeExcludedNavigationLinks(html);
  html = enhanceSeo(html, {
    pageUrl,
    route,
    alternates: originalAlternates,
  });
  html = applyDeployBase(html);
  html = applyStaticAssetVersion(html);
  html = updateExtraProductImagery(html, route);
  html = localizeRussianStaticHtml(html, route);

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

function removeExcludedNavigationLinks(html) {
  const base = DEPLOY_BASE_PATH ? DEPLOY_BASE_PATH.replace(/\/$/, '') : '';
  const excludedRoutes = [...EXCLUDED_PAGE_ROUTES].map((route) => escapeRegExp(`${base}${route}`));
  const excludedLinkPattern = excludedRoutes.join('|');
  return html.replace(
    new RegExp(`\\s*<li\\b[^\\n]*href=["'](?:${excludedLinkPattern})["'][^\\n]*<\\/li>\\s*`, 'gi'),
    '\n',
  );
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
    .replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi, (script) => (
      /"@type"\s*:\s*"Product"/i.test(script) ? '' : script
    ))
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
    .replace(/https:\/\/maps\.google\.com\/maps\?q=30%20route%20d"Angoul%C3%AAme%2016200%20Triac-Lautrait&t=&z=13&ie=UTF8&iwloc=&output=embed/gi, GOOGLE_MAP_EMBED_URL)
    .replace(/<a href="https:\/\/123movies-to\.org"><\/a><br>\s*/gi, '')
    .replace(/<\/style><a href="https:\/\/www\.embedgooglemap\.net"><\/a>\s*<style>/gi, '</style>\n                <style>')
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

function applyDeployBase(text) {
  if (!DEPLOY_BASE_PATH) return text;

  const base = DEPLOY_BASE_PATH.replace(/\/$/, '');
  const basePattern = escapeRegExp(base.slice(1));
  const pageOrAssetPath = '(?:wp-content|wp-includes|assets|categorie-produit|cgv|collection|commander|en|da|sv|no|heritage|la-matiere|lalchimie|le-feu|le-temps|leopold-croizet|mentions-legales|mon-compte|panier|pierre-croizet-cocktails|rencontre|ru|robots\\.txt|sitemap\\.xml|site\\.webmanifest|llms\\.txt)';
  const staticAssetPath = '(?:wp-content|wp-includes|assets)';
  const pageOrAssetRegex = new RegExp(`^/(?!/|${basePattern}(?:/|$))${pageOrAssetPath}(?:/|$)`, 'i');
  const staticAssetRegex = new RegExp(`^/(?!/|${basePattern}(?:/|$))${staticAssetPath}(?:/|$)`, 'i');
  const prefixPageOrAsset = (value) => (pageOrAssetRegex.test(value) ? `${base}${value}` : value);
  const prefixStaticAsset = (value) => (staticAssetRegex.test(value) ? `${base}${value}` : value);

  let rewritten = text.replace(
    /\b(href|src|poster|action|data-src|data-background|data-bg|data-image|data-lazy-src|data-large_image|data-thumb|content)=["']([^"']*)["']/gi,
    (full, attr, value) => `${attr}="${prefixPageOrAsset(value)}"`,
  );

  rewritten = rewritten.replace(
    /\b(srcset|data-srcset)=["']([^"']*)["']/gi,
    (full, attr, value) => `${attr}="${rewriteDeployBaseSrcset(value, prefixPageOrAsset)}"`,
  );

  rewritten = rewritten.replace(/url\((['"]?)(\/(?!\/)[^'")]+)\1\)/gi, (full, quote, value) => (
    `url(${quote}${prefixStaticAsset(value)}${quote})`
  ));

  return rewritten.replace(
    /(^|[="'`(:\s])\/(wp-content|wp-includes|assets)\//g,
    (full, prefix, segment) => `${prefix}${base}/${segment}/`,
  );
}

function applyStaticAssetVersion(html) {
  return html.replace(
    /(\/Cognac-Leopold-Croizet-site\/wp-content\/themes\/theme-site-pc\/(?:style\.css|js\/mobile\.js))(?!\?v=)/g,
    `$1?v=${STATIC_ASSET_VERSION}`,
  );
}

function updateExtraProductImagery(html, route) {
  const base = DEPLOY_BASE_PATH ? DEPLOY_BASE_PATH.replace(/\/$/, '') : '';
  const menuImage = `${base}/wp-content/uploads/2026/06/extra-bt-devant-coffret-menu.png`;
  const menuSrcset = [
    `${base}/wp-content/uploads/2026/06/extra-bt-devant-coffret-menu-420x642.png 420w`,
    `${base}/wp-content/uploads/2026/06/extra-bt-devant-coffret-menu-500x764.png 500w`,
    `${base}/wp-content/uploads/2026/06/extra-bt-devant-coffret-menu-670x1024.png 670w`,
    `${menuImage} 720w`,
  ].join(', ');

  let next = html
    .replace(/src="[^"]*\/wp-content\/uploads\/2021\/06\/img_produit_extra_base(?:-[^"]+)?\.png"/g, `src="${menuImage}"`)
    .replace(/srcset="[^"]*img_produit_extra_base[^"]*"/g, `srcset="${menuSrcset}"`);

  next = next.replace(
    /<figure class="wp-block-image[^"]*">\s*(<a href="([^"]+)">)?<img[^>]+img_home_carre_extra_03-1[^>]+>(<\/a>)?\s*<\/figure>/g,
    (match, anchorStart = '', href = '') => {
      const linkStart = anchorStart ? `<a href="${href}">` : '';
      const linkEnd = anchorStart ? '</a>' : '';
      return `<figure class="wp-block-image size-full is-style-default">${linkStart}<img decoding="async" width="715" height="649" src="${base}/wp-content/uploads/2026/06/extra-bt-dans-coffret-715.png" alt="Cognac Léopold Croizet Extra dans son coffret rouge" class="wp-image-extra-2026" srcset="${base}/wp-content/uploads/2026/06/extra-bt-dans-coffret-420.png 420w, ${base}/wp-content/uploads/2026/06/extra-bt-dans-coffret-500.png 500w, ${base}/wp-content/uploads/2026/06/extra-bt-dans-coffret-715.png 715w, ${base}/wp-content/uploads/2026/06/extra-bt-dans-coffret.png 1200w" sizes="(max-width: 715px) 100vw, 715px" />${linkEnd}</figure>`;
    },
  );

  if (/^\/(?:(?:en|ru|da|sv|no)\/)?collection\/extra\/$/.test(route)) {
    next = next.replace(
      /<figure class="woocommerce-product-gallery__wrapper">[\s\S]*?<\/figure>/,
      extraProductGalleryMarkup(base),
    );
  }

  return next;
}

function extraProductGalleryMarkup(base) {
  const main = `${base}/wp-content/uploads/2026/06/extra-bt-devant-coffret`;
  const open = `${base}/wp-content/uploads/2026/06/extra-bt-dans-coffret`;
  const box = `${base}/wp-content/uploads/2026/06/extra-coffret-seul`;
  return `<figure class="woocommerce-product-gallery__wrapper">
        <div data-thumb="${main}-420.png" data-thumb-alt="Cognac Léopold Croizet Extra avec coffret rouge" class="woocommerce-product-gallery__image"><a href="${main}.png"><img width="420" height="426" src="${main}-420.png" class="wp-post-image" alt="Cognac Léopold Croizet Extra avec coffret rouge" title="Cognac Léopold Croizet Extra avec coffret rouge" data-caption="" data-src="${main}.png" data-large_image="${main}.png" data-large_image_width="1200" data-large_image_height="1219" decoding="async" fetchpriority="high" srcset="${main}-420.png 420w, ${main}-500.png 500w, ${main}-720.png 720w, ${main}.png 1200w" sizes="(max-width: 420px) 100vw, 420px" /></a></div>
        <div data-thumb="${open}-420.png" data-thumb-alt="Cognac Léopold Croizet Extra dans son coffret ouvert" class="woocommerce-product-gallery__image"><a href="${open}.png"><img width="420" height="381" src="${open}-420.png" class="" alt="Cognac Léopold Croizet Extra dans son coffret ouvert" title="Cognac Léopold Croizet Extra dans son coffret ouvert" data-caption="" data-src="${open}.png" data-large_image="${open}.png" data-large_image_width="1200" data-large_image_height="1089" decoding="async" loading="lazy" srcset="${open}-420.png 420w, ${open}-500.png 500w, ${open}-715.png 715w, ${open}.png 1200w" sizes="(max-width: 420px) 100vw, 420px" /></a></div>
        <div data-thumb="${box}-420.png" data-thumb-alt="Coffret rouge Cognac Léopold Croizet Extra" class="woocommerce-product-gallery__image"><a href="${box}.png"><img width="420" height="567" src="${box}-420.png" class="" alt="Coffret rouge Cognac Léopold Croizet Extra" title="Coffret rouge Cognac Léopold Croizet Extra" data-caption="" data-src="${box}.png" data-large_image="${box}.png" data-large_image_width="900" data-large_image_height="1216" decoding="async" loading="lazy" srcset="${box}-420.png 420w, ${box}-500.png 500w, ${box}.png 900w" sizes="(max-width: 420px) 100vw, 420px" /></a></div>    </figure>`;
}

function localizeRussianStaticHtml(html, route) {
  if (!route.startsWith('/ru/')) return html;

  const replacements = [
    ['Hoy-Xay', 'Мастерство'],
    ['title="посещать"', 'title="Визит"'],
    ['>посещать<', '>Визит<'],
    ['>Rencontre<', '>Визит<'],
    ['Un chai multi-médaillé', 'Погреб, отмеченный множеством наград'],
    ['Logo Léopold Croizet', 'Логотип Léopold Croizet'],
    ['Léopold Croizet assis interview', 'Léopold Croizet, интервью'],
    ['Logos medailles', 'Логотипы медалей'],
    ['fond-page', 'фон страницы'],
    ['page déchirée', 'рваная бумага'],
    ['Toggle navigation', 'Открыть меню'],
    ['previous arrow', 'стрелка назад'],
    ['next arrow', 'стрелка вперед'],
    ['Annee', 'Год'],
    ['En cliquant sur « Entrer » vous confirmez avoir l\'âge requis dans votre pays pour visiter ce site.', 'Нажимая «Войти», вы подтверждаете, что достигли возраста, необходимого в вашей стране для посещения этого сайта.'],
    ['Vous acceptez nos <a href="#">Conditions générales d\'utilisation</a> et déclarez avoir lu notre', 'Вы принимаете наши <a href="#">общие условия использования</a> и подтверждаете, что прочитали нашу'],
    ['Charte de données personnelles & Cookies', 'политику персональных данных и cookies'],
    ['>Entrer<', '>Войти<'],
    ['Boutique Cognac Léopold Croizet', 'Бутик Cognac Léopold Croizet'],
    ['Boutique <strong>Cognac</strong> Léopold Croizet', 'Бутик <strong>Cognac</strong> Léopold Croizet'],
    ['Please select a rating', 'Пожалуйста, выберите оценку'],
    ['Your cart is currently empty.', 'Ваша корзина пуста.'],
    ['Return to shop', 'Вернуться в бутик'],
    ['>Login<', '>Вход<'],
    ['Username or email address', 'Имя пользователя или email'],
    ['Password&nbsp;', 'Пароль&nbsp;'],
    ['Remember me', 'Запомнить меня'],
    ['>Log in<', '>Войти<'],
    ['Lost your password?', 'Забыли пароль?'],
    ['Collection <strong>Cognac</strong> Léopold Croizet', 'Коллекция <strong>Cognac</strong> Léopold Croizet'],
    ['Collection  Cognac  Léopold Croizet', 'Коллекция Cognac Léopold Croizet'],
    ['Collection Cognac Léopold Croizet', 'Коллекция Cognac Léopold Croizet'],
    ['Коньяки Пьера Круазе', 'Коньяки Леопольда Круазе'],
    ['коньяки Пьера Круазе', 'коньяки Леопольда Круазе'],
    ['Пьер Круазе', 'Леопольд Круазе'],
    ['Пьера Круазе', 'Леопольда Круазе'],
    ['& aussi...', 'А также...'],
    ['&amp; aussi...', 'А также...'],
    ['>порядок<', '>Заказать<'],
    ['> порядок<', '>Заказать<'],
    ['Appellation cognac Fins Bois controlée', 'Контролируемое наименование Cognac Fins Bois'],
    ['Appellation Cognac Contrôlée', 'Контролируемое наименование Cognac'],
    ['Appelation Cognac Contrôlée', 'Контролируемое наименование Cognac'],
    ['Аппелласьон', 'Наименование'],
    ['Rancio Charentais', 'шарантское рансьо'],
    ['Product quantity', 'Количество товара'],
    ['VS quantity', 'Количество VS'],
    ['VSOP quantity', 'Количество VSOP'],
    ['Napoléon quantity', 'Количество Napoléon'],
    ['XO quantity', 'Количество XO'],
    ['XO Exception quantity', 'Количество XO Exception'],
    ['Extra quantity', 'Количество Extra'],
    ['Excellence quantity', 'Количество Excellence'],
    ['Héritage quantity', 'Количество Héritage'],
    ['Valentine XO quantity', 'Количество Valentine XO'],
    ['Valentine Количество XO', 'Количество Valentine XO'],
    ['Add to cart', 'Добавить в корзину'],
    ['Дегустационные арактеристики', 'Дегустационные характеристики'],
    ['Note sensorielles', 'Дегустационные характеристики'],
    ['Pictogramme Oeil', 'Пиктограмма: глаз'],
    ['Pictogramme Nez', 'Пиктограмма: нос'],
    ['Pictogramme Bouche', 'Пиктограмма: рот'],
    ['separateur-produit', 'разделитель продукта'],
    ['Nерсик', 'персик'],
    ['Rруша', 'груша'],
    ['Cушенный абрикос', 'сушеный абрикос'],
    ['Cлива', 'слива'],
    ['Pоза', 'роза'],
    ['виноградные цветок', 'цветок винограда'],
    ['Visite de nos chais…', 'Визит в наши погреба…'],
    ['<strong>Visite</strong> de nos chais…', '<strong>Визит</strong> в наши погреба…'],
    ['Sur rendez-vous au', 'По предварительной записи по телефону'],
    ['Many long years of aging were (are) indispensable', 'Долгие годы выдержки были необходимы'],
    ['to develop this XO Exception.', 'для создания XO Exception.'],
    ['>Discover<', '>Открыть<'],
    ['LÉOPOLD CROIZET COGNAC FROM GENERATION TO GENERATION', 'COGNAC LÉOPOLD CROIZET ИЗ ПОКОЛЕНИЯ В ПОКОЛЕНИЕ'],
    ['COGNAC LÉOPOLD CROIZET DE GÉNÉRATION EN GÉNÉRATION', 'COGNAC LÉOPOLD CROIZET ИЗ ПОКОЛЕНИЯ В ПОКОЛЕНИЕ'],
    ['Discover a very old Cognac characteristic of Fins Bois.', 'Откройте для себя очень старый Cognac, характерный для Fins Bois.'],
    ['An exceptional and unique creation which is the pride', 'Исключительное и уникальное творение, гордость'],
    ['of the LÉOPOLD CROIZET house and reveals', 'дома LÉOPOLD CROIZET, раскрывающее'],
    ['the excellence of our know-how.', 'совершенство нашего мастерства.'],
    ['EXCELLENCE... <br>Have you experienced ?', 'EXCELLENCE... <br>Вы уже пробовали?'],
    ['Maison LÉOPOLD CROIZET', 'ДОМ LÉOPOLD CROIZET'],
    ['De nombreuses années de vieillissement', 'Многие годы выдержки'],
    ['ont été nécessaires pour élaborer', 'потребовались для создания'],
    ['ce XO Exception.', 'этого XO Exception.'],
    ['>Découvrir<', '>Открыть<'],
    ['>Découvrez<', '>Откройте<'],
    ['un très vieux Cognac', 'очень старый Cognac'],
    ['caractéristique', 'характерный'],
    ['des Fins Bois.', 'для Fins Bois.'],
    ['Une création', 'Творение'],
    ['exceptionnelle', 'исключительное'],
    ['et unique,', 'и уникальное,'],
    ['la fierté de la Maison', 'гордость дома'],
    ['Ce Cognac vous dévoile', 'Этот Cognac раскрывает'],
    ['toute l\'excellence', 'всё совершенство'],
    ['de notre savoir-faire.', 'нашего мастерства.'],
    ['Shake !', 'Shake!'],
    ['Idées fraîches pour les beaux jours', 'Свежие идеи для солнечных дней'],
    ['Découvrir l&#8217;extra Léopold Croizet', 'Открыть Extra Léopold Croizet'],
    ['Découvrir l’extra Léopold Croizet', 'Открыть Extra Léopold Croizet'],
    ['Prendre le temps', 'Дать времени время'],
    ['&#8230; et le remonter', '… и повернуть его вспять'],
    ['… et le remonter', '… и повернуть его вспять'],
    ['Le hasard n&#8217;existe pas', 'Случайностей не бывает'],
    ['Le hasard n’existe pas', 'Случайностей не бывает'],
    ['Je souhaite recevoir de vos nouvelles de temps en temps.', 'Я хочу время от времени получать ваши новости.'],
    ['En renseignant votre adresse e-mail, vous acceptez de recevoir chaque mois nos dernières actualités sur nos produits et vous prenez connaissances de nos', 'Указывая свой e-mail, вы соглашаетесь ежемесячно получать наши последние новости о продуктах и подтверждаете, что ознакомились с нашими'],
    ['mentions légales', 'правовыми уведомлениями'],
    ['Pour vous désinscrire, merci d\'envoyer un e-mail à cognac@mdpierrre.com.', 'Чтобы отписаться, отправьте письмо на cognac@mdpierrre.com.'],
    ['placeholder="Laissez nous votre e-mail"', 'placeholder="Оставьте ваш e-mail"'],
    ['>Envoyer<', '>Отправить<'],
    ['Le travail de la vigne mobile', 'Работа на винограднике'],
    ['Le travail de la vigne', 'Работа на винограднике'],
    ['Le raisin mobile', 'Виноград'],
    ['Les vendanges mobile', 'Сбор урожая'],
    ['L\'assemblage', 'Ассамбляж'],
    ['La mise en bouteille', 'Розлив в бутылки'],
    ['La distillation mobile', 'Дистилляция'],
    ['Double distillation mobile', 'Двойная дистилляция'],
    ['double distillation', 'двойная дистилляция'],
    ['Le vieillissement mobile', 'Выдержка'],
    ['vente eaux de vie', 'продажа коньячных спиртов'],
    ['ventes edv - mobile', 'продажа коньячных спиртов'],
    ['ventes fille - mobile', 'продажа дочери'],
    ['acte mariage - mobile', 'брачный акт'],
    ['ventes bois lantin - mobile', 'продажа Bois Lantin'],
    ['acte de vente - mobile', 'акт продажи'],
    ['etiquette - mobile', 'этикетка'],
    ['vue aerienne - mobile', 'вид с воздуха'],
    ['Marc Fouché - mobile', 'Марк Фуше'],
    ['Léopold Croizet - mobile', 'Леопольд Круазе'],
    ['Eaux-de-vie', 'коньячные спирты'],
    ['eaux de vies', 'коньячных спиртов'],
    ['eaux de vie', 'коньячных спиртов'],
    ['eaux-de-vie', 'коньячные спирты'],
    ['нашего коньячных спиртов', 'наших коньячных спиртов'],
    ['divers actes', 'разные документы'],
    ['В чем заключается ваша работа и ее масштабы в Maison Léopold Croizet?', 'В чем заключается ваша работа и каков ее масштаб в доме Léopold Croizet?'],
    ['Я рассказываю о коньяках Леопольда Круазе нашим клиентам и своим друзьям.', 'Я рассказываю о коньяках Léopold Croizet нашим клиентам и своим друзьям.'],
    ['наших eaux de vie', 'наших коньячных спиртов'],
  ];

  let localized = html;
  for (const [from, to] of replacements) {
    localized = localized.split(from).join(to);
  }

  localized = localized
    .replace(/href="\/Cognac-Leopold-Croizet-site\/collection\//g, 'href="/Cognac-Leopold-Croizet-site/ru/collection/')
    .replace(/href="\/Cognac-Leopold-Croizet-site\/le-temps\//g, 'href="/Cognac-Leopold-Croizet-site/ru/le-temps/')
    .replace(/href="http:\/\/cognacg\.cluster028\.hosting\.ovh\.net\/wordpress\/produit\/xo-exception\/"/g, 'href="/Cognac-Leopold-Croizet-site/ru/collection/xo-exception/"')
    .replace(/href="http:\/\/cognacg\.cluster028\.hosting\.ovh\.net\/wordpress\/produit\/extra\/"/g, 'href="/Cognac-Leopold-Croizet-site/ru/collection/extra/"')
    .replace(/href="http:\/\/cognacg\.cluster028\.hosting\.ovh\.net\/wordpress\/le-temps\/"/g, 'href="/Cognac-Leopold-Croizet-site/ru/le-temps/"')
    .replace(/href="http:\/\/cognacg\.cluster028\.hosting\.ovh\.net\/wordpress\/lalchimie\/"/g, 'href="/Cognac-Leopold-Croizet-site/ru/lalchimie/"')
    .replace(
      /Je suis Léopold Croizet, je représente la 9e génération de vignerons sur le domaine\. J’en ai hérité de mon père qui en a hérité de sa mère qui en a elle-même hérité de son père et ainsi de suite… Notre vignoble, planté principalement sur la commune de Triac Lautrait, réunit 30 hectares autour d’une ferme typiquement charentaise\. Ici on est au cœur du village, Lantin, à proximité de Jarnac\. C’est un terroir privilégié\. Il appartient au cru des Fins Bois et bénéficie des limites argilo-calcaires des terres de Champagne\.\s*/g,
      'Я — Леопольд Круазе, представитель девятого поколения виноградарей этого поместья. Я унаследовал его от отца, который унаследовал его от своей матери, а она — от своего отца, и так далее… Наш виноградник, расположенный главным образом в коммуне Triac-Lautrait, занимает 30 гектаров вокруг типичной шарантской фермы. Здесь мы находимся в самом сердце деревни Lantin, недалеко от Jarnac. Это исключительный терруар: он относится к крю Fins Bois и пользуется глинисто-известковыми границами земель Champagne. ',
    );

  return applyRussianOrderLinks(removeRussianPrices(applyRussianSeo(localized, route)), route);
}

function removeRussianPrices(html) {
  return html
    .replace(/\s*<div class="prix-produit-collection">\s*<span>[0-9\s.,]+<\/span>\s*€\s*<\/div>\s*/g, '\n')
    .replace(/\s*<div class="prix-produit-container">\s*<span>[0-9\s.,]+<\/span>\s*€\s*<\/div>\s*/g, '\n');
}

function applyRussianOrderLinks(html, route) {
  const orderLinks = new Map([
    ['/ru/collection/vs/', 'https://av.ru/i/1021709'],
    ['/ru/collection/vsop/', 'https://av.ru/i/174054'],
    ['/ru/collection/napoleon/', 'https://av.ru/i/1020490'],
    ['/ru/collection/xo/', 'https://av.ru/i/1020491'],
    ['/ru/collection/xo-exception/', 'https://av.ru/i/1005624'],
    ['/ru/collection/extra/', 'https://av.ru/i/174057'],
    ['/ru/collection/excellence/', 'https://av.ru/i/231809'],
    ['/ru/collection/heritage/', 'https://av.ru/search/?freeText=Leopold%20Croizet%20Heritage'],
    ['/ru/collection/valentine/', 'https://av.ru/i/178511'],
  ]);
  const orderLink = orderLinks.get(route);
  if (!orderLink) return html;

  return html
    .replace(
      /href="[^"]*"\s+class=" btn-commander-produit"/,
      `href="${orderLink}" class=" btn-commander-produit"`,
    )
    .replace(
      /wp-content\/themes\/theme-site-pc\/js\/btn-commander-produit\.js(?!\?)/,
      'wp-content/themes/theme-site-pc/js/btn-commander-produit.js?v=av-order-20260609',
    );
}

function applyRussianSeo(html, route) {
  const title = russianRouteTitles(route);
  const description = russianRouteDescription(route);
  let localized = html;

  if (title) {
    localized = localized
      .replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
      .replace(/<meta property="og:title" content="[^"]*">/i, `<meta property="og:title" content="${title}">`);
  }

  if (description) {
    localized = localized
      .replace(/<meta name="description" content="[^"]*">/i, `<meta name="description" content="${description}">`)
      .replace(/<meta property="og:description" content="[^"]*">/i, `<meta property="og:description" content="${description}">`);
  }

  return localized;
}

function russianRouteTitles(route) {
  const titles = new Map([
    ['/ru/', 'Cognac Léopold Croizet'],
    ['/ru/a-faire/', 'Коллекция Cognac Léopold Croizet | Cognac Léopold Croizet'],
    ['/ru/categorie-produit/non-classe-ru/', 'Коллекция Cognac Léopold Croizet | Cognac Léopold Croizet'],
    ['/ru/rencontre/', 'Визит в наши погреба… | Cognac Léopold Croizet'],
    ['/ru/mon-compte-2/', 'Мой аккаунт | Cognac Léopold Croizet'],
    ['/ru/panier-2/', 'Корзина | Cognac Léopold Croizet'],
    ['/ru/validation/', 'Оформление заказа | Cognac Léopold Croizet'],
  ]);
  const productName = russianProductName(route);
  if (productName) return `${productName} | Cognac Léopold Croizet`;
  return titles.get(route) || '';
}

function russianRouteDescription(route) {
  const descriptions = new Map([
    ['/ru/', 'Cognac Léopold Croizet: семейное мастерство, органический виноградник, коллекция коньяков и визиты в погреба.'],
    ['/ru/a-faire/', 'Коллекция Cognac Léopold Croizet: VS, VSOP, Napoléon, XO, XO Exception, Extra, Excellence и Héritage.'],
    ['/ru/categorie-produit/non-classe-ru/', 'Коллекция Cognac Léopold Croizet: VS, VSOP, Napoléon, XO, XO Exception, Extra, Excellence и Héritage.'],
    ['/ru/la-matiere/', 'Материя Cognac Léopold Croizet: виноградник, органическое земледелие, виноград и сбор урожая.'],
    ['/ru/lalchimie/', 'Алхимия Cognac Léopold Croizet: ассамбляж, розлив и создание коньяков дома.'],
    ['/ru/le-feu/', 'Огонь Cognac Léopold Croizet: двойная дистилляция, выдержка и работа с французским дубом.'],
    ['/ru/le-temps/', 'Время Cognac Léopold Croizet: архивы, семейная история и передача мастерства из поколения в поколение.'],
    ['/ru/rencontre/', 'Визит в погреба Cognac Léopold Croizet в Triac-Lautrait, по предварительной записи.'],
    ['/ru/mon-compte-2/', 'Мой аккаунт Cognac Léopold Croizet: вход в личный кабинет клиента.'],
    ['/ru/panier-2/', 'Корзина бутика Cognac Léopold Croizet.'],
    ['/ru/validation/', 'Оформление заказа в бутике Cognac Léopold Croizet.'],
  ]);

  const productName = russianProductName(route);
  if (productName) {
    return `Откройте Cognac Léopold Croizet ${productName}: описание, характеристики, дегустационные ноты и заказ онлайн.`;
  }

  return descriptions.get(route) || 'Официальный сайт Cognac Léopold Croizet: коллекция коньяков, мастерство, история дома и визиты в погреба.';
}

function russianProductName(route) {
  const slug = matchFirst(route, /^\/ru\/collection\/([^/]+)\//);
  if (!slug) return '';
  const productNames = new Map([
    ['vs', 'VS'],
    ['vsop', 'VSOP'],
    ['napoleon', 'Napoléon'],
    ['xo', 'XO'],
    ['xo-exception', 'XO Exception'],
    ['extra', 'Extra'],
    ['excellence', 'Excellence'],
    ['heritage', 'Héritage'],
    ['valentine', 'Valentine XO'],
  ]);
  return productNames.get(slug) || labelFromPath(slug);
}

function applyDeployBaseToCss(text) {
  if (!DEPLOY_BASE_PATH) return text;

  const base = DEPLOY_BASE_PATH.replace(/\/$/, '');
  const basePattern = escapeRegExp(base.slice(1));
  const staticAssetRegex = new RegExp(`^/(?!/|${basePattern}(?:/|$))(?:wp-content|wp-includes|assets)(?:/|$)`, 'i');

  return text.replace(/url\((['"]?)(\/(?!\/)[^'")]+)\1\)/gi, (full, quote, value) => (
    `url(${quote}${staticAssetRegex.test(value) ? `${base}${value}` : value}${quote})`
  ));
}

function applyDeployBaseToScript(text) {
  if (!DEPLOY_BASE_PATH) return text;

  const base = DEPLOY_BASE_PATH.replace(/\/$/, '');
  const basePattern = escapeRegExp(base.slice(1));

  return text
    .replace(
      new RegExp(`(["'\`])/(?!/|${basePattern}(?:/|$))(wp-content|wp-includes|assets)/`, 'g'),
      `$1${base}/$2/`,
    )
    .replace(
      new RegExp(`\\\\/(?!${basePattern}\\\\/)(wp-content|wp-includes|assets)\\\\/`, 'g'),
      `\\/${base.slice(1)}\\/$1\\/`,
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

function rewriteDeployBaseSrcset(value, prefixLocalUrl) {
  return value
    .split(',')
    .map((candidate) => {
      const trimmed = candidate.trim();
      if (!trimmed) return trimmed;
      const [url, ...descriptor] = trimmed.split(/\s+/);
      return [prefixLocalUrl(url), ...descriptor].join(' ');
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
    email: 'cognac@mdpierrre.com',
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
  if (route.startsWith('/da/')) return 'da';
  if (route.startsWith('/sv/')) return 'sv';
  if (route.startsWith('/no/')) return 'no';
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
      body = repairStylesheetAsset(body, localPath);
      collectAssets(body, url.toString());
      body = rewriteCssUrls(body, url.toString());
      body = applyDeployBaseToCss(body);
      await writeText(localPath, body);
    } else if (contentType.includes('javascript') || localPath.endsWith('.js')) {
      body = await response.text();
      body = repairScriptAsset(body, localPath);
      collectAssets(body, url.toString());
      body = applyDeployBaseToScript(body);
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

function repairStylesheetAsset(body, localPath) {
  if (localPath === 'wp-content/themes/theme-site-pc/style.css') {
    const repaired = body.replace(/\n?\.wpml-ls-item-ru\s*\{\s*display:\s*none\s*!important;\s*\}\s*/gi, '\n');
    if (repaired.includes('nav.navbar .wpml-ls-legacy-list-horizontal')) return repaired;

    return `${repaired}
@media screen and (max-width: 1199px) {
  nav.navbar {
    flex-wrap: wrap;
  }
  nav.navbar a.logo-header {
    order: 1;
  }
  nav.navbar .wpml-ls-legacy-list-horizontal {
    order: 2;
    margin-left: auto;
    padding: 0 12px;
  }
  nav.navbar .wpml-ls-legacy-list-horizontal ul {
    margin: 0 !important;
  }
  nav.navbar .navbar-toggler {
    order: 3;
  }
  nav.navbar .menu-site {
    order: 4;
    width: 100%;
  }
}
`;
  }

  return body;
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

  if (localPath === 'wp-content/themes/theme-site-pc/js/mobile.js') {
    return body.replace(
      /function move_language_switch\(\) \{\s*if \(window\.matchMedia\("\(min-width: 1200px\)"\)\.matches\) \{\s*\$\(("\.wpml-ls-legacy-list-horizontal"|'\.wpml-ls-legacy-list-horizontal')\)\.appendTo\(("\.navbar"|'\.navbar')\);\s*\} else \{\s*\$\(("\.wpml-ls-legacy-list-horizontal"|'\.wpml-ls-legacy-list-horizontal')\)\.appendTo\(("\.menu-site ul#menu-menu-principal"|'\.menu-site ul#menu-menu-principal')\);\s*\}\s*\}/,
      `function move_language_switch() {
        $(".wpml-ls-legacy-list-horizontal").appendTo(".navbar");
    }`,
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
    'Contact: cognac@mdpierrre.com, +33 5 45 35 88 10, 30 Route d’Angoulême, 16200 Triac-Lautrait, France.',
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

function toLocalRoute(url) {
  const prefix = HOST_PREFIX.get(url.hostname) || '';
  return `${prefix}${normalizePagePath(url.pathname)}`;
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
