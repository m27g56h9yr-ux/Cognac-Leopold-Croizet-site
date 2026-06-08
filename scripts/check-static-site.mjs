import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEPLOY_BASE_PATH = '/Cognac-Leopold-Croizet-site';
const checkedFiles = [];
const missing = [];
const dynamicReferences = [];
const brandViolations = [];

await walk(ROOT);

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
    brandViolations.push(...findBrandViolations(text, relativeFile));
  }
}

if (missing.length || dynamicReferences.length || brandViolations.length) {
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

  process.exit(1);
}

console.log(`Checked ${checkedFiles.length} HTML/CSS files`);

async function walk(dir) {
  if (dir.includes(`${path.sep}.git${path.sep}`)) return;
  const entries = await readdir(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const info = await stat(fullPath);
    if (info.isDirectory()) {
      await walk(fullPath);
    } else if (/\.(html|css)$/.test(entry)) {
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
    .replace(/\bhttps?:\/\/\S*croizet\S*/gi, ' ')
    .replace(/\bwww\.\S*croizet\S*/gi, ' ')
    .replace(/\b\S*@\S*croizet\S*/gi, ' ')
    .replace(/\b(?:[\w-]*croizet[\w-]*\.)+[\w.-]+/gi, ' ')
    .replace(/\b\S*[-_/]\S*croizet\S*\b/gi, ' ');
}
