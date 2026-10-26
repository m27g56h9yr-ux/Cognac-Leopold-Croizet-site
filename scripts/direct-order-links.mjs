import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { withDeployBase } from './deploy-config.mjs';

// Existing French production mappings, read from conversion-tracking.js on 2026-10-26.
// Do not infer availability from the format selector or add other territories here.
export const directOrderProducts = {
  vs: { name: 'VS', formats: { 700: 'LC0001', 350: 'LC0002' } },
  vsop: { name: 'VSOP', formats: { 700: 'LC0003', 350: 'LC0004' } },
  napoleon: { name: 'Napoléon', formats: { 700: 'LC0007' } },
  xo: { name: 'XO', formats: { 700: 'LC0009' } },
  'xo-exception': { name: 'XO Exception', formats: { 700: 'LC0011' } },
  extra: { name: 'Extra', formats: { 700: 'LC0012' } },
  excellence: { name: 'Excellence', formats: { 700: 'LC0013' } },
  heritage: { name: 'Héritage', formats: { 700: 'LC0014' } },
  valentine: { name: 'Valentine XO', formats: { 350: 'LC0015' } },
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function injectDirectOrder(html, route) {
  const slug = /^\/collection\/([a-z0-9-]+)\/$/.exec(route)?.[1];
  const product = directOrderProducts[slug];
  if (!product) return html;
  let next = html
    .replace(/\n?<!-- lc-direct-order-start -->[\s\S]*?<!-- lc-direct-order-end -->\n?/g, '')
    .replace(/\n?<link\b[^>]*id="lc-direct-order-css"[^>]*>/g, '')
    .replace(/\n?<script\b[^>]*id="lc-direct-order-js"[^>]*><\/script>/g, '');
  const model = /<button\b(?=[^>]*data-product-model-option="([^"]+)")(?=[^>]*aria-pressed="true")[^>]*>/.exec(next)?.[1];
  const volume = model ? /^(\d+) ml$/.exec(model)?.[1] : (product.formats[700] ? '700' : '350');
  if (!product.formats[volume]) throw new Error(`No verified default order format for ${route}: ${model}`);
  const links = Object.fromEntries(Object.entries(product.formats).map(([ml, sku]) => [
    `${ml} ml`, `https://boutique.mdpierre.com/commander/?mdp_ref=${sku}&mdp_lang=fr`,
  ]));
  const productName = `Cognac Léopold\u00a0Croizet ${product.name}`;
  const format = `${Number(volume) / 10} cl`;
  const block = `<!-- lc-direct-order-start -->
<section id="mdp-direct-order" aria-label="Commander ${escape(productName)}" data-order-product="${escape(productName)}" data-order-links="${escape(JSON.stringify(links))}">
  <div class="lc-direct-order-control">
    <span class="lc-direct-order-format" data-order-format>${format}</span>
    <a class="lc-direct-order-link" data-order-link href="${escape(links[`${volume} ml`])}" aria-label="Commander ${escape(productName)} ${format} sur boutique.mdpierre.com" aria-describedby="lc-direct-order-note">Commander</a>
  </div>
  <p id="lc-direct-order-note" class="lc-direct-order-note">Boutique en ligne · mdpierre.com</p>
  <p class="lc-direct-order-delivery">Livraison en France métropolitaine ou retrait gratuit à la propriété.</p>
  <span class="lc-direct-order-sr" data-order-status role="status"></span>
</section>
<!-- lc-direct-order-end -->`;
  const gallery = /<div\b[^>]*class="[^"]*\bwoocommerce-product-gallery\b[^"]*"[^>]*>/.exec(next);
  if (!gallery) throw new Error(`Product gallery missing for ${route}`);
  const divs = /<\/?div\b[^>]*>/g;
  divs.lastIndex = gallery.index;
  let depth = 0;
  let tag;
  let end;
  while ((tag = divs.exec(next))) {
    depth += tag[0].startsWith('</') ? -1 : 1;
    if (depth === 0) { end = tag.index; break; }
  }
  if (end === undefined) throw new Error(`Unclosed product gallery for ${route}`);
  next = `${next.slice(0, end)}${block}\n${next.slice(end)}`;
  next = next.replace('</head>', `<link id="lc-direct-order-css" rel="stylesheet" href="${withDeployBase('/assets/direct-order.css?v=20261026-1')}">\n</head>`);
  return next.replace('</body>', `<script id="lc-direct-order-js" src="${withDeployBase('/assets/js/direct-order.js?v=20261026-1')}" defer></script>\n</body>`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const slug of Object.keys(directOrderProducts)) {
    const route = `/collection/${slug}/`;
    const file = path.join(root, route, 'index.html');
    await writeFile(file, injectDirectOrder(await readFile(file, 'utf8'), route));
  }
  console.log('Updated 9 French product pages with the existing 11 order references.');
}
