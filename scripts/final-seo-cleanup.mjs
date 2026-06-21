import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeLegacyDeployBase } from './deploy-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_ORIGIN = 'https://cognac-leopold-croizet.com';

const productNames = new Map([
  ['vs', 'VS'],
  ['vsop', 'VSOP'],
  ['napoleon', 'Napoleon'],
  ['xo', 'XO'],
  ['xo-exception', 'XO Exception'],
  ['extra', 'Extra'],
  ['excellence', 'Excellence'],
  ['heritage', 'Heritage'],
  ['valentine', 'Valentine XO'],
  ['pineau-des-charentes', 'Pineau des Charentes'],
  ['pineau-des-charentes-rouge', 'Pineau Rouge des Charentes'],
]);

const productFallbackFacts = new Map([
  ['vs', { appellation: 'Cognac Fins Bois contrôlée', bottleSize: '70 cl', abv: '40 %' }],
  ['vsop', { appellation: 'Cognac Fins Bois contrôlée', bottleSize: '70 cl', abv: '40 %' }],
  ['napoleon', { appellation: 'Cognac Fins Bois contrôlée', bottleSize: '70 cl', abv: '40 %' }],
  ['xo', { appellation: 'Cognac Fins Bois contrôlée', bottleSize: '70 cl', abv: '40 %' }],
  ['xo-exception', { appellation: 'Cognac Fins Bois contrôlée', bottleSize: '70 cl', abv: '40 %' }],
  ['extra', { appellation: 'Cognac Fins Bois contrôlée', bottleSize: '70 cl', abv: '40 %' }],
  ['excellence', { appellation: 'Cognac Fins Bois contrôlée', bottleSize: '70 cl', abv: '40 %' }],
  ['heritage', { appellation: 'Cognac Fins Bois contrôlée', bottleSize: '70 cl', abv: '40 %' }],
  ['valentine', { appellation: 'Cognac Fins Bois contrôlée', bottleSize: '35 cl', abv: '40 %' }],
  ['pineau-des-charentes', { appellation: 'Pineau des Charentes contrôlée', bottleSize: '75 cl', abv: '17,5 %' }],
  ['pineau-des-charentes-rouge', { appellation: 'Pineau des Charentes contrôlée', bottleSize: '75 cl', abv: '17,5 %' }],
]);

let changed = 0;
let h1Inserted = 0;
let productSchemaUpdated = 0;
let charsetMoved = 0;
let contentNormalized = 0;

for (const file of await walkHtml(ROOT)) {
  const route = routeForFile(file);
  const original = await readFile(file, 'utf8');
  let next = original;

  next = ensureEarlyCharset(next);
  if (next !== original) charsetMoved += 1;

  const beforeH1 = next;
  next = ensureSingleH1(next, route);
  if (next !== beforeH1) h1Inserted += 1;

  const beforeSchema = next;
  next = enrichProductSchema(next, route);
  if (next !== beforeSchema) productSchemaUpdated += 1;

  const beforeContent = next;
  next = normalizePublicContent(next);
  if (next !== beforeContent) contentNormalized += 1;

  next = normalizeGeneratedWhitespace(next);
  const normalizedNext = normalizeLegacyDeployBase(next);
  if (normalizedNext !== original) {
    await writeFile(file, normalizedNext, 'utf8');
    changed += 1;
  }
}

console.log(`[seo] Final cleanup updated ${changed} page(s): charset ${charsetMoved}, H1 ${h1Inserted}, Product schema ${productSchemaUpdated}, content ${contentNormalized}.`);

async function walkHtml(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'wp-content') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkHtml(fullPath));
    } else if (entry.isFile() && entry.name === 'index.html') {
      files.push(fullPath);
    }
  }

  return files;
}

function routeForFile(file) {
  const relative = path.relative(ROOT, file).replace(/\\/g, '/');
  if (relative === 'index.html') return '/';
  return `/${relative.replace(/index\.html$/, '')}`;
}

function ensureEarlyCharset(html) {
  if (!/<head\b[^>]*>/i.test(html)) return html;

  let next = html
    .replace(/\s*<meta\s+charset=["'][^"']+["']\s*\/?>/gi, '')
    .replace(/\s*<meta\s+http-equiv=["']Content-Type["'][^>]*>\s*/gi, '\n');

  return next.replace(/<head([^>]*)>/i, '<head$1>\n<meta charset="UTF-8">');
}

function ensureSingleH1(html, route) {
  if (isNoindex(html) || route.startsWith('/_preview/')) return html;
  const h1Matches = html.match(/<h1\b[\s\S]*?<\/h1>/gi) || [];
  if (h1Matches.length === 1) return html;
  if (h1Matches.length > 1) return html;

  const heading = h1TextForRoute(html, route);
  if (!heading) return html;

  return html.replace(/<body([^>]*)>/i, `<body$1>\n<h1 class="screen-reader-text lc-seo-h1">${escapeHtml(heading)}</h1>`);
}

function h1TextForRoute(html, route) {
  const product = productSchemaFromHtml(html);
  if (product?.name) return product.name;

  if (route === '/') return 'Cognac Léopold Croizet';

  const title = textFromHtml(matchFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i));
  if (!title) return labelFromRoute(route);
  return title.split('|')[0].trim() || title;
}

function enrichProductSchema(html, route) {
  const slug = productSlugFromRoute(route);
  if (!slug) return html;

  const scripts = [];
  const withoutJsonLd = html.replace(/<script\b(?=[^>]*type=(["'])application\/ld\+json\1)[^>]*>([\s\S]*?)<\/script>\s*/gi, (_block, _quote, rawJson) => {
    try {
      scripts.push(JSON.parse(rawJson.trim()));
    } catch {
      scripts.push(null);
    }
    return '';
  });

  if (scripts.length === 0) return html;

  const facts = productFactsFromHtml(html, slug);
  let touched = false;
  const nextScripts = scripts.map((script) => mutateSchemas(script, (schema) => {
    if (!hasSchemaType(schema, 'Product')) return schema;

    touched = true;
    const pageUrl = `${PUBLIC_ORIGIN}${route}`;
    const next = { ...schema };
    next['@id'] = `${pageUrl}#product`;
    next.url = pageUrl;
    next.countryOfOrigin = 'France';
    next.brand = { '@id': `${PUBLIC_ORIGIN}/#organization` };
    next.manufacturer = { '@id': `${PUBLIC_ORIGIN}/#organization` };
    next.additionalProperty = productProperties(facts);
    return next;
  }));

  if (!touched) return html;

  const jsonLd = nextScripts
    .filter(Boolean)
    .map((script) => `<script type="application/ld+json">${JSON.stringify(script)}</script>`)
    .join('\n');

  return withoutJsonLd.replace(/<\/head>/i, `${jsonLd}\n</head>`);
}

function mutateSchemas(value, mapper) {
  if (Array.isArray(value)) return value.map((item) => mutateSchemas(item, mapper));
  if (value && typeof value === 'object' && Array.isArray(value['@graph'])) {
    return { ...value, '@graph': value['@graph'].map((item) => mutateSchemas(item, mapper)) };
  }
  if (value && typeof value === 'object') return mapper(value);
  return value;
}

function productFactsFromHtml(html, slug) {
  const text = visibleText(html);
  const fallback = productFallbackFacts.get(slug) || {};
  const bottleSize = matchFirst(text, /\b(\d+(?:[.,]\d+)?\s*cl)\b/i) || fallback.bottleSize;
  const abv = matchFirst(text, /\b(\d+(?:[.,]\d+)?\s*%)\b/) || fallback.abv;
  const appellation = (
    matchFirst(text, /(Appellation\s+(?:cognac\s+)?Fins Bois\s+control[ée]e)/i)
    || matchFirst(text, /(Pineau des Charentes\s+control[ée]e)/i)
    || fallback.appellation
  );

  return { appellation, bottleSize, abv };
}

function productProperties(facts) {
  return [
    facts.appellation ? { '@type': 'PropertyValue', name: 'Appellation', value: normalizeFact(facts.appellation) } : null,
    facts.bottleSize ? { '@type': 'PropertyValue', name: 'Bottle size', value: normalizeFact(facts.bottleSize) } : null,
    facts.abv ? { '@type': 'PropertyValue', name: 'ABV', value: normalizeFact(facts.abv) } : null,
  ].filter(Boolean);
}

function normalizeFact(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/controlee/gi, 'contrôlée')
    .replace(/17\.5\s*%/g, '17,5 %')
    .trim();
}

function normalizePublicContent(html) {
  return String(html || '')
    .replace(/30\s+Route d(?:'|’|&rsquo;|&#8217;)Angoulême/gi, '30 Rue d’Angoulême')
    .replace(/www\.leopold-croizet\.com/g, 'cognac-leopold-croizet.com')
    .replace(/<a href=(["'])\/Cognac-Leopold-Croizet-site\/\1>cognac-leopold-croizet\.com<\/a>/g, '<a href="https://cognac-leopold-croizet.com/">cognac-leopold-croizet.com</a>');
}

function productSchemaFromHtml(html) {
  for (const rawJson of html.matchAll(/<script\b(?=[^>]*type=(["'])application\/ld\+json\1)[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const schema = findSchema(JSON.parse(rawJson[2].trim()), 'Product');
      if (schema) return schema;
    } catch {
      // Ignore invalid JSON-LD here; validation will catch it separately.
    }
  }
  return null;
}

function findSchema(value, typeName) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findSchema(item, typeName);
      if (found) return found;
    }
  }
  if (value && typeof value === 'object') {
    if (hasSchemaType(value, typeName)) return value;
    if (Array.isArray(value['@graph'])) return findSchema(value['@graph'], typeName);
  }
  return null;
}

function hasSchemaType(schema, typeName) {
  const type = schema?.['@type'];
  if (Array.isArray(type)) return type.includes(typeName);
  return type === typeName;
}

function productSlugFromRoute(route) {
  return matchFirst(route, /^\/(?:(?:en|ru|da|sv|no|zh)\/)?collection\/([^/]+)\//);
}

function isNoindex(html) {
  return /<meta\b(?=[^>]*name=(["'])robots\1)(?=[^>]*content=(["'])[^"']*noindex[^"']*\2)[^>]*>/i.test(html);
}

function labelFromRoute(route) {
  const last = route.split('/').filter(Boolean).pop() || 'Cognac Léopold Croizet';
  const productName = productNames.get(last);
  if (productName) return productName;
  try {
    return decodeURIComponent(last).replace(/-/g, ' ').replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
  } catch {
    return last.replace(/-/g, ' ');
  }
}

function visibleText(html) {
  return textFromHtml(String(html || '')
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' '));
}

function textFromHtml(fragment) {
  return decodeEntities(String(fragment || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim());
}

function decodeEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#([0-9]+);/g, (_match, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function matchFirst(text, regex) {
  const match = String(text || '').match(regex);
  return match ? match[1] : '';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizeGeneratedWhitespace(html) {
  const cleaned = html
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n');
  return cleaned.endsWith('\n') ? cleaned : `${cleaned}\n`;
}
