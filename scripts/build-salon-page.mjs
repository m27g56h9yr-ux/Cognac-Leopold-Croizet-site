import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

// Standalone templates own their layout, metadata and consent forms.
export async function buildSalonPage() {
  for (const [template, route] of [['salon', 'se-retrouver'], ['salon-desinscription', 'se-retrouver/desinscription']]) {
    const source = await readFile(path.join(ROOT, `scripts/page-templates/${template}.html.in`), 'utf8');
    await mkdir(path.join(ROOT, route), { recursive: true });
    await writeFile(path.join(ROOT, route, 'index.html'), source);
  }
  await writeFile(path.join(ROOT, 'se-retrouver/.htaccess'), await readFile(path.join(ROOT, 'salon/.htaccess')));
  // Apache provides 301s. These pages also preserve private fragments on static previews.
  for (const suffix of ['', 'desinscription/']) {
    const target = `/se-retrouver/${suffix}`;
    const directory = path.join(ROOT, 'salon', suffix);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'index.html'), `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive"><meta name="referrer" content="no-referrer">
<title>Se retrouver · Cognac Léopold Croizet</title>
<link rel="canonical" href="https://cognac-leopold-croizet.com${target}">
<script>location.replace(${JSON.stringify(target)} + location.search + location.hash);</script>
</head><body><p><a href="${target}">Retrouvons-nous sur notre nouvelle page.</a></p></body></html>
`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildSalonPage();
  console.log('Generated Se retrouver, withdrawal and legacy redirects');
}
