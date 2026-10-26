import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { injectDirectOrder } from './direct-order-links.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Independent production baseline: compare destinations, not just link counts.
const expected = {
  vs: { 700: 'LC0001', 350: 'LC0002' }, vsop: { 700: 'LC0003', 350: 'LC0004' },
  napoleon: { 700: 'LC0007' }, xo: { 700: 'LC0009' }, 'xo-exception': { 700: 'LC0011' },
  extra: { 700: 'LC0012' }, excellence: { 700: 'LC0013' }, heritage: { 700: 'LC0014' },
  valentine: { 350: 'LC0015' },
};
const runtime = await readFile(path.join(root, 'assets/js/direct-order.js'), 'utf8');
const decode = value => value.replaceAll('&quot;', '"').replaceAll('&amp;', '&');
let verified = 0;
for (const [slug, formats] of Object.entries(expected)) {
  const route = `/collection/${slug}/`;
  const html = await readFile(path.join(root, route, 'index.html'), 'utf8');
  const section = html.match(/<section id="mdp-direct-order"[\s\S]*?<\/section>/)?.[0];
  assert(section, `${slug}: static order link missing`);
  assert(!section.includes('Maison des Pierres'), `${slug}: unwanted seller label`);
  assert(!/price|InStock|BuyAction/.test(section), `${slug}: unsupported offer claim`);
  const data = decode(section.match(/data-order-links="([^"]+)"/)[1]);
  const links = JSON.parse(data);
  assert.equal(Object.keys(links).length, Object.keys(formats).length);
  for (const [ml, sku] of Object.entries(formats)) {
    assert.equal(links[`${ml} ml`], `https://boutique.mdpierre.com/commander/?mdp_ref=${sku}&mdp_lang=fr`);
    verified++;
  }
  const defaultMl = formats[700] ? '700' : '350';
  assert(section.includes(`href="https://boutique.mdpierre.com/commander/?mdp_ref=${formats[defaultMl]}&amp;mdp_lang=fr"`));
  assert(html.includes(`rel="canonical" href="https://cognac-leopold-croizet.com${route}"`));
  const rebuilt = injectDirectOrder(injectDirectOrder(html, route), route);
  assert.equal((rebuilt.match(/id="mdp-direct-order"/g) || []).length, 1, 'rebuild duplicated CTA');
  assert.equal((rebuilt.match(/id="lc-direct-order-js"/g) || []).length, 1);

  const attrs = new Map();
  const link = { textContent: '', setAttribute: (key, value) => attrs.set(key, value), removeAttribute: key => attrs.delete(key) };
  const format = { textContent: '' };
  const status = { textContent: '' };
  let selected = null;
  let update;
  const box = {
    getAttribute: name => name === 'data-order-links' ? data : `Cognac Léopold Croizet ${slug}`,
    querySelector: selector => ({ '[data-order-link]': link, '[data-order-format]': format, '[data-order-status]': status })[selector],
  };
  vm.runInNewContext(runtime, {
    document: { getElementById: () => box, querySelector: () => selected, querySelectorAll: () => [{}] },
    MutationObserver: class { constructor(callback) { update = callback; } observe() {} },
  });
  for (const origin of ['data-product-model-option', 'data-volume-option']) {
    for (const model of [...Object.keys(formats).map(ml => `${ml} ml`), '1000 ml', '3000 ml', 'gift-set-700', '350 ml', '700 ml']) {
      selected = { textContent: model, getAttribute: name => name === origin ? model : null };
      update();
      const ml = /^(\d+) ml$/.exec(model)?.[1];
      if (formats[ml]) {
        assert.equal(attrs.get('href'), `https://boutique.mdpierre.com/commander/?mdp_ref=${formats[ml]}&mdp_lang=fr`);
        assert(!attrs.has('aria-disabled'));
      } else {
        assert(!attrs.has('href'), `${slug}: ${model} must never order a substitute format`);
        assert.equal(attrs.get('aria-disabled'), 'true');
      }
      assert.equal(format.textContent, model);
    }
  }
}
for (const lang of ['en', 'ru', 'da', 'sv', 'no', 'zh']) {
  for (const slug of Object.keys(expected)) {
    const route = `/${lang}/collection/${slug}/`;
    const html = await readFile(path.join(root, route, 'index.html'), 'utf8');
    assert(!html.includes('id="mdp-direct-order"'), `French shop leaked to ${route}`);
    assert.equal(injectDirectOrder(html, route), html);
  }
}
for (const slug of ['pineau-des-charentes', 'pineau-des-charentes-rouge']) {
  const html = await readFile(path.join(root, `collection/${slug}/index.html`), 'utf8');
  assert(!html.includes('id="mdp-direct-order"'));
}
console.log(`Checked 9 pages, ${verified} unchanged order references, both selectors, unsupported formats and 56 excluded pages.`);
