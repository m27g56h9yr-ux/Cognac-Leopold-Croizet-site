import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

// The salon page owns its small layout and local font URLs; it does not use
// the WordPress navigation, newsletter handler, geolocation or tracking code.
export async function buildSalonPage() {
  for (const [template, route] of [['salon', 'salon'], ['salon-desinscription', 'salon/desinscription']]) {
    const source = await readFile(path.join(ROOT, `scripts/page-templates/${template}.html.in`), 'utf8');
    await mkdir(path.join(ROOT, route), { recursive: true });
    await writeFile(path.join(ROOT, route, 'index.html'), source);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildSalonPage();
  console.log('Generated salon contact and withdrawal pages');
}

