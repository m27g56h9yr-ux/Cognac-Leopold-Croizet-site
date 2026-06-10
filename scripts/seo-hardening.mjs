import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_ORIGIN = 'https://cognac-leopold-croizet.com';
const TODAY = '2026-06-10';

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

const contentGroups = [
  ['/', '/en/', '/ru/', '/da/', '/sv/', '/no/'],
  ['/collection/', '/en/shop/', '/ru/a-faire/', '/da/shop/', '/sv/shop/', '/no/shop/'],
  ['/la-matiere/', '/en/la-matiere/', '/ru/la-matiere/', '/da/la-matiere/', '/sv/la-matiere/', '/no/la-matiere/'],
  ['/le-feu/', '/en/le-feu/', '/ru/le-feu/', '/da/le-feu/', '/sv/le-feu/', '/no/le-feu/'],
  ['/lalchimie/', '/en/lalchimie/', '/ru/lalchimie/', '/da/lalchimie/', '/sv/lalchimie/', '/no/lalchimie/'],
  ['/le-temps/', '/en/le-temps/', '/ru/le-temps/', '/da/le-temps/', '/sv/le-temps/', '/no/le-temps/'],
  ['/leopold-croizet/', '/en/leopold-croizet/', '/ru/%d0%bb%d0%b5%d0%be%d0%bf%d0%be%d0%bb%d1%8c%d0%b4%d0%b0-%d0%ba%d1%80%d1%83%d0%b0%d0%b7%d0%b5/', '/da/leopold-croizet/', '/sv/leopold-croizet/', '/no/leopold-croizet/'],
  ['/rencontre/', '/en/rencontre/', '/ru/rencontre/', '/da/rencontre/', '/sv/rencontre/', '/no/rencontre/'],
  ['/pierre-croizet-cocktails/', '/en/pierre-croizet-cocktails/', '/ru/pierre-croizet-cocktails/', '/da/pierre-croizet-cocktails/', '/sv/pierre-croizet-cocktails/', '/no/pierre-croizet-cocktails/'],
  ...[...productNames.keys()].map((slug) => [`/collection/${slug}/`, `/en/collection/${slug}/`, `/ru/collection/${slug}/`, `/da/collection/${slug}/`, `/sv/collection/${slug}/`, `/no/collection/${slug}/`]),
];

const routeMetadata = new Map([
  ['/', {
    title: 'Cognac Léopold Croizet | Maison familiale en Fins Bois',
    description: 'Cognac Léopold Croizet, maison familiale à Triac-Lautrait en Fins Bois : cognacs VS, VSOP, Napoléon, XO, Extra, savoir-faire et visites des chais.',
  }],
  ['/en/', {
    title: 'Cognac Léopold Croizet | Family Cognac Estate in Fins Bois',
    description: 'Cognac Léopold Croizet is a family estate in Triac-Lautrait, Fins Bois, producing VS, VSOP, Napoléon, XO and Extra cognacs with vineyard-to-cellar know-how.',
  }],
  ['/ru/', {
    title: 'Cognac Léopold Croizet | Семейный дом коньяка Fins Bois',
    description: 'Cognac Léopold Croizet: семейное поместье в Triac-Lautrait, Fins Bois, коллекция VS, VSOP, Napoléon, XO и Extra, мастерство и визиты в погреба.',
  }],
  ['/da/', {
    title: 'Cognac Léopold Croizet | Familieejet cognachus i Fins Bois',
    description: 'Cognac Léopold Croizet er et familieejet cognachus i Triac-Lautrait, Fins Bois, med VS, VSOP, Napoléon, XO og Extra cognacs samt besøg i kældrene.',
  }],
  ['/sv/', {
    title: 'Cognac Léopold Croizet | Familjeägt cognachus i Fins Bois',
    description: 'Cognac Léopold Croizet är ett familjeägt cognachus i Triac-Lautrait, Fins Bois, med VS, VSOP, Napoléon, XO och Extra cognac samt besök i källarna.',
  }],
  ['/no/', {
    title: 'Cognac Léopold Croizet | Familieeid cognachus i Fins Bois',
    description: 'Cognac Léopold Croizet er et familieeid cognachus i Triac-Lautrait, Fins Bois, med VS, VSOP, Napoléon, XO og Extra cognac samt besøk i kjellerne.',
  }],
  ['/collection/', {
    title: 'Collection Cognac Léopold Croizet | VS, VSOP, XO et Extra',
    description: 'Découvrez la collection Cognac Léopold Croizet : VS, VSOP, Napoléon, XO, XO Exception, Extra, Excellence, Héritage et Valentine XO.',
  }],
  ['/en/shop/', {
    title: 'Cognac Léopold Croizet Collection | VS, VSOP, XO and Extra',
    description: 'Discover the Cognac Léopold Croizet collection: VS, VSOP, Napoléon, XO, XO Exception, Extra, Excellence, Héritage and Valentine XO.',
  }],
  ['/ru/a-faire/', {
    title: 'Коллекция Cognac Léopold Croizet | VS, VSOP, XO и Extra',
    description: 'Откройте коллекцию Cognac Léopold Croizet: VS, VSOP, Napoléon, XO, XO Exception, Extra, Excellence, Héritage и Valentine XO.',
  }],
  ['/da/shop/', {
    title: 'Cognac Léopold Croizet Kollektion | VS, VSOP, XO og Extra',
    description: 'Opdag Cognac Léopold Croizet kollektionen: VS, VSOP, Napoléon, XO, XO Exception, Extra, Excellence, Héritage og Valentine XO.',
  }],
  ['/sv/shop/', {
    title: 'Cognac Léopold Croizet Kollektion | VS, VSOP, XO och Extra',
    description: 'Upptäck Cognac Léopold Croizet kollektionen: VS, VSOP, Napoléon, XO, XO Exception, Extra, Excellence, Héritage och Valentine XO.',
  }],
  ['/no/shop/', {
    title: 'Cognac Léopold Croizet Kolleksjon | VS, VSOP, XO og Extra',
    description: 'Oppdag Cognac Léopold Croizet kolleksjonen: VS, VSOP, Napoléon, XO, XO Exception, Extra, Excellence, Héritage og Valentine XO.',
  }],
  ['/commander/', {
    title: 'Commander Cognac Léopold Croizet | Boutique officielle',
    description: 'Commandez les cognacs Léopold Croizet depuis la boutique officielle : VS, VSOP, Napoléon, XO, XO Exception, Extra, Excellence et Héritage.',
  }],
  ['/la-matiere/', {
    title: 'Le fruit | Vignes et terroir Cognac Léopold Croizet',
    description: 'Le fruit Cognac Léopold Croizet : vignes, terroir de Fins Bois, viticulture biologique, raisins et vendanges à Triac-Lautrait.',
  }],
  ['/en/la-matiere/', {
    title: 'The Fruit | Vines and Terroir Cognac Léopold Croizet',
    description: 'The fruit behind Cognac Léopold Croizet: vines, Fins Bois terroir, organic vineyard work, grapes and harvest in Triac-Lautrait.',
  }],
  ['/ru/la-matiere/', {
    title: 'Плод | Виноградник и терруар Cognac Léopold Croizet',
    description: 'Материя Cognac Léopold Croizet: виноградник, терруар Fins Bois, органическое земледелие, виноград и сбор урожая в Triac-Lautrait.',
  }],
  ['/da/la-matiere/', {
    title: 'Frugten | Vinstokke og terroir Cognac Léopold Croizet',
    description: 'Frugten bag Cognac Léopold Croizet: vinstokke, Fins Bois-terroir, økologisk arbejde i vinmarken, druer og høst i Triac-Lautrait.',
  }],
  ['/sv/la-matiere/', {
    title: 'Frukten | Vinrankor och terroir Cognac Léopold Croizet',
    description: 'Frukten bakom Cognac Léopold Croizet: vinrankor, Fins Bois-terroir, ekologiskt arbete i vingården, druvor och skörd i Triac-Lautrait.',
  }],
  ['/no/la-matiere/', {
    title: 'Frukten | Vinstokker og terroir Cognac Léopold Croizet',
    description: 'Frukten bak Cognac Léopold Croizet: vinstokker, Fins Bois-terroir, økologisk arbeid i vinmarken, druer og innhøsting i Triac-Lautrait.',
  }],
  ['/le-feu/', {
    title: 'Le feu | Distillation Cognac Léopold Croizet',
    description: 'Le feu Cognac Léopold Croizet : double distillation charentaise, alambic, élevage et précision du travail en chai.',
  }],
  ['/en/le-feu/', {
    title: 'The Fire | Distillation Cognac Léopold Croizet',
    description: 'The fire behind Cognac Léopold Croizet: Charentais double distillation, copper stills, ageing and cellar precision.',
  }],
  ['/ru/le-feu/', {
    title: 'Огонь | Дистилляция Cognac Léopold Croizet',
    description: 'Огонь Cognac Léopold Croizet: шарантская двойная дистилляция, аламбик, выдержка и точность работы в погребе.',
  }],
  ['/da/le-feu/', {
    title: 'Ilden | Destillation Cognac Léopold Croizet',
    description: 'Ilden bag Cognac Léopold Croizet: dobbelt charentais-destillation, kobberalambic, lagring og præcision i kælderen.',
  }],
  ['/sv/le-feu/', {
    title: 'Elden | Destillation Cognac Léopold Croizet',
    description: 'Elden bakom Cognac Léopold Croizet: charentais dubbel destillation, kopparpannor, lagring och precision i källaren.',
  }],
  ['/no/le-feu/', {
    title: 'Ilden | Destillasjon Cognac Léopold Croizet',
    description: 'Ilden bak Cognac Léopold Croizet: charentais dobbelt destillasjon, kobberalambic, lagring og presisjon i kjelleren.',
  }],
  ['/lalchimie/', {
    title: "L'Alchimie | Assemblage Cognac Léopold Croizet",
    description: "L'Alchimie Cognac Léopold Croizet : assemblage, maturation, mise en bouteille et savoir-faire familial transmis.",
  }],
  ['/en/lalchimie/', {
    title: 'Alchemy | Blending Cognac Léopold Croizet',
    description: 'Alchemy at Cognac Léopold Croizet: blending, maturation, bottling and family know-how passed down through generations.',
  }],
  ['/ru/lalchimie/', {
    title: 'Алхимия | Ассамбляж Cognac Léopold Croizet',
    description: 'Алхимия Cognac Léopold Croizet: ассамбляж, созревание, розлив и семейное мастерство, передаваемое из поколения в поколение.',
  }],
  ['/da/lalchimie/', {
    title: 'Alkymi | Assemblage Cognac Léopold Croizet',
    description: 'Alkymi hos Cognac Léopold Croizet: assemblage, modning, aftapning og familiehåndværk overleveret gennem generationer.',
  }],
  ['/sv/lalchimie/', {
    title: 'Alkemi | Assemblage Cognac Léopold Croizet',
    description: 'Alkemi hos Cognac Léopold Croizet: assemblage, mognad, buteljering och familjekunnande som förs vidare genom generationer.',
  }],
  ['/no/lalchimie/', {
    title: 'Alkymi | Assemblage Cognac Léopold Croizet',
    description: 'Alkymi hos Cognac Léopold Croizet: assemblage, modning, tapping og familiehåndverk videreført gjennom generasjoner.',
  }],
  ['/le-temps/', {
    title: 'Le temps | Héritage Cognac Léopold Croizet',
    description: "Le temps Cognac Léopold Croizet : archives, histoire familiale, vieillissement et transmission d'un savoir-faire de génération en génération.",
  }],
  ['/en/le-temps/', {
    title: 'Time | Heritage Cognac Léopold Croizet',
    description: 'Time at Cognac Léopold Croizet: archives, family history, ageing and know-how passed down from generation to generation.',
  }],
  ['/ru/le-temps/', {
    title: 'Время | Наследие Cognac Léopold Croizet',
    description: 'Время Cognac Léopold Croizet: архивы, семейная история, выдержка и передача мастерства из поколения в поколение.',
  }],
  ['/da/le-temps/', {
    title: 'Tiden | Arv Cognac Léopold Croizet',
    description: 'Tiden hos Cognac Léopold Croizet: arkiver, familiehistorie, lagring og overlevering af savoir-faire fra generation til generation.',
  }],
  ['/sv/le-temps/', {
    title: 'Tiden | Arv Cognac Léopold Croizet',
    description: 'Tiden hos Cognac Léopold Croizet: arkiv, familjehistoria, lagring och överföring av kunnande från generation till generation.',
  }],
  ['/no/le-temps/', {
    title: 'Tiden | Arv Cognac Léopold Croizet',
    description: 'Tiden hos Cognac Léopold Croizet: arkiver, familiehistorie, lagring og videreføring av håndverk fra generasjon til generasjon.',
  }],
  ['/leopold-croizet/', {
    title: 'Léopold Croizet | Interview et histoire familiale',
    description: "Rencontre avec Léopold Croizet : histoire familiale, domaine de Triac-Lautrait, transmission et vision d'une maison de cognac indépendante.",
  }],
  ['/en/leopold-croizet/', {
    title: 'Léopold Croizet | Interview and Family Story',
    description: 'Meet Léopold Croizet: family story, Triac-Lautrait estate, transmission and the vision of an independent cognac house.',
  }],
  ['/ru/%d0%bb%d0%b5%d0%be%d0%bf%d0%be%d0%bb%d1%8c%d0%b4%d0%b0-%d0%ba%d1%80%d1%83%d0%b0%d0%b7%d0%b5/', {
    title: 'Леопольд Круазе | Интервью и семейная история',
    description: 'Встреча с Леопольдом Круазе: семейная история, поместье Triac-Lautrait, преемственность и видение независимого дома коньяка.',
  }],
  ['/da/leopold-croizet/', {
    title: 'Léopold Croizet | Interview og familiehistorie',
    description: 'Mød Léopold Croizet: familiehistorie, ejendommen i Triac-Lautrait, overlevering og visionen for et uafhængigt cognachus.',
  }],
  ['/sv/leopold-croizet/', {
    title: 'Léopold Croizet | Intervju och familjehistoria',
    description: 'Möt Léopold Croizet: familjehistoria, egendomen i Triac-Lautrait, tradition och visionen för ett självständigt cognachus.',
  }],
  ['/no/leopold-croizet/', {
    title: 'Léopold Croizet | Intervju og familiehistorie',
    description: 'Møt Léopold Croizet: familiehistorie, eiendommen i Triac-Lautrait, overføring og visjonen for et uavhengig cognachus.',
  }],
  ['/rencontre/', {
    title: 'Visite des chais Cognac Léopold Croizet | Triac-Lautrait',
    description: 'Visitez les chais Cognac Léopold Croizet à Triac-Lautrait, près de Jarnac, sur rendez-vous, et découvrez le domaine familial.',
  }],
  ['/en/rencontre/', {
    title: 'Visit the Cognac Léopold Croizet Cellars | Triac-Lautrait',
    description: 'Visit the Cognac Léopold Croizet cellars in Triac-Lautrait, near Jarnac, by appointment, and discover the family estate.',
  }],
  ['/ru/rencontre/', {
    title: 'Визит в погреба Cognac Léopold Croizet | Triac-Lautrait',
    description: 'Посетите погреба Cognac Léopold Croizet в Triac-Lautrait, недалеко от Jarnac, по предварительной записи.',
  }],
  ['/da/rencontre/', {
    title: 'Besøg Cognac Léopold Croizet kældre | Triac-Lautrait',
    description: 'Besøg Cognac Léopold Croizet kældre i Triac-Lautrait, tæt på Jarnac, efter aftale, og oplev familiens ejendom.',
  }],
  ['/sv/rencontre/', {
    title: 'Besök Cognac Léopold Croizet källare | Triac-Lautrait',
    description: 'Besök Cognac Léopold Croizet källare i Triac-Lautrait, nära Jarnac, efter överenskommelse och upptäck familjeegendomen.',
  }],
  ['/no/rencontre/', {
    title: 'Besøk Cognac Léopold Croizet kjellere | Triac-Lautrait',
    description: 'Besøk Cognac Léopold Croizet kjellere i Triac-Lautrait, nær Jarnac, etter avtale og oppdag familieeiendommen.',
  }],
  ['/pierre-croizet-cocktails/', {
    title: 'Cocktails Cognac Léopold Croizet | Recettes au Cognac et Pineau',
    description: "Découvrez Charente Spritz, L'Heure Dorée, Ginger d'Or et Golden Melon, quatre cocktails avec Cognac Léopold Croizet et Pineau des Charentes.",
  }],
  ['/en/pierre-croizet-cocktails/', {
    title: 'Cognac Léopold Croizet Cocktails | Cognac and Pineau Recipes',
    description: "Discover Charente Spritz, L'Heure Dorée, Ginger d'Or and Golden Melon, four cocktails with Cognac Léopold Croizet and Pineau des Charentes.",
  }],
  ['/ru/pierre-croizet-cocktails/', {
    title: 'Коктейли с Cognac Léopold Croizet | Рецепты с коньяком и Pineau',
    description: "Откройте Charente Spritz, L'Heure Dorée, Ginger d'Or и Golden Melon, четыре коктейля с Cognac Léopold Croizet и Pineau des Charentes.",
  }],
  ['/da/pierre-croizet-cocktails/', {
    title: 'Cognac Léopold Croizet cocktails | Opskrifter med Cognac og Pineau',
    description: "Opdag Charente Spritz, L'Heure Dorée, Ginger d'Or og Golden Melon, fire cocktails med Cognac Léopold Croizet og Pineau des Charentes.",
  }],
  ['/sv/pierre-croizet-cocktails/', {
    title: 'Cognac Léopold Croizet cocktails | Recept med Cognac och Pineau',
    description: "Upptäck Charente Spritz, L'Heure Dorée, Ginger d'Or och Golden Melon, fyra cocktails med Cognac Léopold Croizet och Pineau des Charentes.",
  }],
  ['/no/pierre-croizet-cocktails/', {
    title: 'Cognac Léopold Croizet cocktails | Oppskrifter med Cognac og Pineau',
    description: "Oppdag Charente Spritz, L'Heure Dorée, Ginger d'Or og Golden Melon, fire cocktails med Cognac Léopold Croizet og Pineau des Charentes.",
  }],
]);

for (const [slug, name] of productNames) {
  routeMetadata.set(`/collection/${slug}/`, {
    title: `${name} | Cognac Léopold Croizet`,
    description: `Découvrez Cognac Léopold Croizet ${name} : notes de dégustation, caractère, élevage et savoir-faire d'une maison familiale de Fins Bois.`,
  });
  routeMetadata.set(`/en/collection/${slug}/`, {
    title: `${name} | Cognac Léopold Croizet`,
    description: `Discover Cognac Léopold Croizet ${name}: tasting notes, character, ageing and family know-how from Fins Bois.`,
  });
  routeMetadata.set(`/ru/collection/${slug}/`, {
    title: `${name} | Cognac Léopold Croizet`,
    description: `Откройте Cognac Léopold Croizet ${name}: дегустационные ноты, характер, выдержка и семейное мастерство Fins Bois.`,
  });
  routeMetadata.set(`/da/collection/${slug}/`, {
    title: `${name} | Cognac Léopold Croizet`,
    description: `Opdag Cognac Léopold Croizet ${name}: smagsnoter, karakter, lagring og familiens savoir-faire fra Fins Bois.`,
  });
  routeMetadata.set(`/sv/collection/${slug}/`, {
    title: `${name} | Cognac Léopold Croizet`,
    description: `Upptäck Cognac Léopold Croizet ${name}: smaknoter, karaktär, lagring och familjens kunnande från Fins Bois.`,
  });
  routeMetadata.set(`/no/collection/${slug}/`, {
    title: `${name} | Cognac Léopold Croizet`,
    description: `Oppdag Cognac Léopold Croizet ${name}: smaksnoter, karakter, lagring og familiens håndverk fra Fins Bois.`,
  });
}

const noindexRoutes = new Set([
  '/categorie-produit/non-classe/',
  '/en/categorie-produit/non-classe-en/',
  '/ru/categorie-produit/non-classe-ru/',
  '/da/categorie-produit/non-classe-en/',
  '/sv/categorie-produit/non-classe-en/',
  '/no/categorie-produit/non-classe-en/',
  '/cgv/',
  '/mentions-legales/',
  '/mon-compte/',
  '/en/my-account/',
  '/ru/mon-compte-2/',
  '/da/my-account/',
  '/sv/my-account/',
  '/no/my-account/',
  '/panier/',
  '/en/cart/',
  '/ru/panier-2/',
  '/da/cart/',
  '/sv/cart/',
  '/no/cart/',
  '/en/checkout/',
  '/ru/validation/',
  '/da/checkout/',
  '/sv/checkout/',
  '/no/checkout/',
]);

const allHtmlFiles = await walkHtml(ROOT);
const existingRoutes = new Set(allHtmlFiles.map((file) => routeForFile(file)));
const routeToGroup = makeGroupMap(existingRoutes);
const indexableRoutes = [];

for (const file of allHtmlFiles) {
  const route = routeForFile(file);
  let html = await readFile(file, 'utf8');
  html = hardenHtml(html, route, file);
  await writeFile(file, html, 'utf8');
  if (!noindexRoutes.has(route)) indexableRoutes.push(route);
}

indexableRoutes.sort((a, b) => a.localeCompare(b));
await writeFile(path.join(ROOT, 'robots.txt'), makeRobots(), 'utf8');
await writeFile(path.join(ROOT, 'sitemap.xml'), makeSitemap(indexableRoutes), 'utf8');
await writeFile(path.join(ROOT, 'llms.txt'), makeLlmsTxt(), 'utf8');
await writeFile(path.join(ROOT, 'llms-full.txt'), makeLlmsFullTxt(), 'utf8');

const indexNowKey = 'lc-indexnow-20260609-' + createHash('sha256').update(PUBLIC_ORIGIN).digest('hex').slice(0, 32);
await writeFile(path.join(ROOT, `${indexNowKey}.txt`), `${indexNowKey}\n`, 'utf8');
await writeFile(path.join(ROOT, 'indexnow.json'), `${JSON.stringify({
  host: new URL(PUBLIC_ORIGIN).hostname,
  key: indexNowKey,
  keyLocation: `${PUBLIC_ORIGIN}/${indexNowKey}.txt`,
  sitemap: `${PUBLIC_ORIGIN}/sitemap.xml`,
}, null, 2)}\n`, 'utf8');

console.log(`SEO hardening applied to ${allHtmlFiles.length} pages`);

async function walkHtml(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkHtml(full));
    } else if (entry.name === 'index.html') {
      files.push(full);
    }
  }
  return files;
}

function routeForFile(file) {
  const relative = path.relative(ROOT, file).replace(/\\/g, '/');
  if (relative === 'index.html') return '/';
  return `/${relative.replace(/index\.html$/, '')}`;
}

function languageForRoute(route) {
  if (route.startsWith('/en/')) return 'en';
  if (route.startsWith('/ru/')) return 'ru';
  if (route.startsWith('/da/')) return 'da';
  if (route.startsWith('/sv/')) return 'sv';
  if (route.startsWith('/no/')) return 'no';
  return 'fr';
}

function localeForRoute(route) {
  return { fr: 'fr_FR', en: 'en_GB', ru: 'ru_RU', da: 'da_DK', sv: 'sv_SE', no: 'nb_NO' }[languageForRoute(route)];
}

function hardenHtml(html, route, file) {
  const metadata = routeMetadata.get(route) || fallbackMetadata(route, html);
  const canonical = `${PUBLIC_ORIGIN}${route}`;
  const lang = languageForRoute(route);
  const robots = noindexRoutes.has(route) ? 'noindex, follow' : 'index, follow, max-image-preview:large';
  const image = bestImageForPage(html, route);
  const alternates = makeAlternateTags(route);

  let next = html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+name=["']description["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+name=["']robots["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+rel=["']alternate["'][^>]+hreflang=["'][^"']+["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+hreflang=["'][^"']+["'][^>]+rel=["']alternate["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+property=["']og:(?:type|title|description|url|image|locale)["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+name=["']twitter:card["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+name=["']twitter:(?:title|description|image)["'][^>]*>\s*/gi, '');

  if (/<html[^>]*lang=/i.test(next)) {
    next = next.replace(/<html([^>]*)lang=["'][^"']*["']([^>]*)>/i, `<html$1lang="${lang}"$2>`);
  }

  const headBlock = [
    `<title>${escapeHtml(metadata.title)}</title>`,
    `<meta name="description" content="${escapeHtml(metadata.description)}">`,
    `<meta name="robots" content="${robots}">`,
    `<link rel="canonical" href="${canonical}">`,
    ...alternates,
    `<meta property="og:type" content="${route.includes('/collection/') ? 'product' : 'website'}">`,
    `<meta property="og:locale" content="${localeForRoute(route)}">`,
    `<meta property="og:title" content="${escapeHtml(metadata.title)}">`,
    `<meta property="og:description" content="${escapeHtml(metadata.description)}">`,
    `<meta property="og:url" content="${canonical}">`,
    image ? `<meta property="og:image" content="${PUBLIC_ORIGIN}${image}">` : '',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapeHtml(metadata.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(metadata.description)}">`,
    image ? `<meta name="twitter:image" content="${PUBLIC_ORIGIN}${image}">` : '',
  ].filter(Boolean).join('\n');

  next = next.replace(/<head([^>]*)>/i, `<head$1>\n${headBlock}\n`);
  next = replaceStructuredData(next, route, metadata, image);
  return next.endsWith('\n') ? next : `${next}\n`;
}

function fallbackMetadata(route, html) {
  const currentTitle = stripTags(matchFirst(html, /<title>([\s\S]*?)<\/title>/i));
  const title = currentTitle && !/Maison familiale depuis|Single family estate/i.test(currentTitle)
    ? currentTitle
    : `${labelFromRoute(route)} | Cognac Léopold Croizet`;
  return {
    title: title.includes('Léopold Croizet') ? title : `${title} | Cognac Léopold Croizet`,
    description: `${labelFromRoute(route)} sur le site officiel Cognac Léopold Croizet : collection, savoir-faire familial et domaine de Triac-Lautrait.`,
  };
}

function labelFromRoute(route) {
  if (route === '/') return 'Cognac Léopold Croizet';
  return decodeURIComponent(route.split('/').filter(Boolean).pop() || 'Cognac')
    .replace(/-/g, ' ')
    .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

function bestImageForPage(html, route) {
  if (route === '/' || route === '/en/' || route === '/ru/' || route === '/da/' || route === '/sv/' || route === '/no/') return '/wp-content/uploads/2024/03/img_slider_footer_01.png';
  if (route.includes('pierre-croizet-cocktails')) return '/wp-content/uploads/2026/06/cocktails/heure-doree-scene.jpg';
  if (/^\/(?:(?:en|ru|da|sv|no)\/)?collection\/extra\/$/.test(route)) return '/wp-content/uploads/2026/06/extra-bt-devant-coffret.png';
  if (/^\/(?:(?:en|ru|da|sv|no)\/)?collection\/excellence\/$/.test(route)) return '/wp-content/uploads/2026/06/img_excellence_etui.jpg';
  const productImage = matchFirst(html, /<img\b[^>]+class=["'][^"']*(?:wp-post-image|attachment-woocommerce_single)[^"']*["'][^>]+src=["']([^"']+)["']/i)
    || matchFirst(html, /<img\b[^>]+src=["']([^"']*img_produit[^"']+)["']/i);
  if (productImage) return normalizePublicPath(productImage);
  const firstImage = matchFirst(html, /<img\b[^>]+src=["']([^"']+)["']/i);
  return normalizePublicPath(firstImage) || '/wp-content/uploads/2024/03/img_slider_footer_01.png';
}

function normalizePublicPath(src) {
  if (!src || src.startsWith('data:')) return '';
  try {
    const url = new URL(src, PUBLIC_ORIGIN);
    return url.pathname.replace(/^\/Cognac-Leopold-Croizet-site/, '');
  } catch {
    return src.startsWith('/') ? src.replace(/^\/Cognac-Leopold-Croizet-site/, '') : '';
  }
}

function makeGroupMap(existingRoutes) {
  const map = new Map();
  for (const group of contentGroups) {
    const existing = group.filter((route) => existingRoutes.has(route));
    for (const route of existing) map.set(route, existing);
  }
  return map;
}

function makeAlternateTags(route) {
  const group = routeToGroup.get(route);
  if (!group) return [`<link rel="alternate" hreflang="${languageForRoute(route)}" href="${PUBLIC_ORIGIN}${route}">`];
  const tags = group.map((alternateRoute) => (
    `<link rel="alternate" hreflang="${languageForRoute(alternateRoute)}" href="${PUBLIC_ORIGIN}${alternateRoute}">`
  ));
  tags.push(`<link rel="alternate" hreflang="x-default" href="${PUBLIC_ORIGIN}${group[0]}">`);
  return tags;
}

function replaceStructuredData(html, route, metadata, image) {
  const schemas = [organizationSchema(), webPageSchema(route, metadata, image), breadcrumbSchema(route)];
  const product = productSchema(route, metadata, image);
  if (product) schemas.push(product);
  const recipes = cocktailRecipesSchema(route);
  if (recipes) schemas.push(...recipes);
  if (route === '/') schemas.push(webSiteSchema());

  const block = `<script type="application/ld+json">${JSON.stringify(schemas.length === 1 ? schemas[0] : schemas)}</script>`;
  let cleaned = html.replace(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi, '');
  return cleaned.replace(/<\/head>/i, `${block}\n</head>`);
}

function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${PUBLIC_ORIGIN}/#organization`,
    name: 'Cognac Léopold Croizet',
    alternateName: ['Maison Léopold Croizet', 'Maison Cognac Léopold Croizet'],
    url: PUBLIC_ORIGIN,
    logo: `${PUBLIC_ORIGIN}/wp-content/uploads/2024/03/logo_leopold_croizet_footer_02.svg`,
    image: `${PUBLIC_ORIGIN}/wp-content/uploads/2024/03/img_slider_footer_01.png`,
    email: 'cognac@mdpierrre.com',
    telephone: '+33545358810',
    address: {
      '@type': 'PostalAddress',
      streetAddress: "30 Route d'Angoulême",
      postalCode: '16200',
      addressLocality: 'Triac-Lautrait',
      addressRegion: 'Charente',
      addressCountry: 'FR',
    },
    sameAs: ['https://www.facebook.com/leopold.croizet.cognac'],
  };
}

function webSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${PUBLIC_ORIGIN}/#website`,
    name: 'Cognac Léopold Croizet',
    url: PUBLIC_ORIGIN,
    publisher: { '@id': `${PUBLIC_ORIGIN}/#organization` },
    inLanguage: ['fr', 'en', 'ru', 'da', 'sv', 'no'],
  };
}

function webPageSchema(route, metadata, image) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${PUBLIC_ORIGIN}${route}#webpage`,
    url: `${PUBLIC_ORIGIN}${route}`,
    name: metadata.title,
    description: metadata.description,
    inLanguage: languageForRoute(route),
    isPartOf: { '@id': `${PUBLIC_ORIGIN}/#website` },
    publisher: { '@id': `${PUBLIC_ORIGIN}/#organization` },
    primaryImageOfPage: image ? { '@type': 'ImageObject', url: `${PUBLIC_ORIGIN}${image}` } : undefined,
  };
}

function breadcrumbSchema(route) {
  const parts = route.split('/').filter(Boolean);
  const itemListElement = [{
    '@type': 'ListItem',
    position: 1,
    name: 'Cognac Léopold Croizet',
    item: `${PUBLIC_ORIGIN}/`,
  }];
  let current = '';
  parts.forEach((part, index) => {
    current += `/${part}`;
    itemListElement.push({
      '@type': 'ListItem',
      position: index + 2,
      name: productNames.get(part) || labelFromRoute(`/${part}/`),
      item: `${PUBLIC_ORIGIN}${current}/`,
    });
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  };
}

function productSchema(route, metadata, image) {
  const slug = matchFirst(route, /^\/(?:(?:en|ru|da|sv|no)\/)?collection\/([^/]+)\//);
  const name = productNames.get(slug);
  if (!name) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `Cognac Léopold Croizet ${name}`,
    description: metadata.description,
    image: image ? `${PUBLIC_ORIGIN}${image}` : undefined,
    category: 'Cognac',
    brand: {
      '@type': 'Brand',
      name: 'Cognac Léopold Croizet',
    },
    manufacturer: { '@id': `${PUBLIC_ORIGIN}/#organization` },
  };
}

function cocktailRecipesSchema(route) {
  if (!route.includes('pierre-croizet-cocktails')) return null;
  const lang = languageForRoute(route);
  const names = [
    ['Charente Spritz', 'Pineau Rosé des Charentes, Cognac Léopold Croizet VS, melon charentais, eau pétillante'],
    ["L'Heure Dorée", 'Pineau Blanc des Charentes, Cognac Léopold Croizet VS, melon charentais, basilic, citron vert'],
    ["Ginger d'Or", 'Cognac Léopold Croizet, ginger beer, citron vert'],
    ['Golden Melon', 'Cognac Léopold Croizet VSOP, Vieux Pineau des Charentes, melon, miel d’acacia'],
  ];
  return names.map(([name, ingredients]) => ({
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name,
    description: recipeDescription(lang, name, ingredients),
    recipeIngredient: ingredients.split(', '),
    author: { '@id': `${PUBLIC_ORIGIN}/#organization` },
    image: `${PUBLIC_ORIGIN}/wp-content/uploads/2026/06/cocktails/heure-doree-scene.jpg`,
    inLanguage: lang,
  }));
}

function recipeDescription(lang, name, ingredients) {
  if (lang === 'ru') return `${name}: коктейль с ${ingredients}.`;
  if (lang === 'en') return `${name}: cocktail with ${ingredients}.`;
  if (lang === 'da') return `${name}: cocktail med ${ingredients}.`;
  if (lang === 'sv') return `${name}: cocktail med ${ingredients}.`;
  if (lang === 'no') return `${name}: cocktail med ${ingredients}.`;
  return `${name} : cocktail avec ${ingredients}.`;
}

function makeRobots() {
  return [
    'User-agent: *',
    'Allow: /',
    '',
    'Sitemap: https://cognac-leopold-croizet.com/sitemap.xml',
    '',
    '# Yandex: group common tracking parameters under the canonical URL.',
    'Clean-param: utm_source&utm_medium&utm_campaign&utm_content&utm_term&fbclid&gclid&yclid&v /',
    '',
  ].join('\n');
}

function makeSitemap(routes) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ];
  for (const route of routes) {
    lines.push('  <url>');
    lines.push(`    <loc>${escapeXml(`${PUBLIC_ORIGIN}${route}`)}</loc>`);
    lines.push(`    <lastmod>${TODAY}</lastmod>`);
    lines.push(`    <changefreq>${isHomepage(route) ? 'weekly' : 'monthly'}</changefreq>`);
    lines.push(`    <priority>${priorityForRoute(route)}</priority>`);
    for (const alternate of routeToGroup.get(route) || [route]) {
      lines.push(`    <xhtml:link rel="alternate" hreflang="${languageForRoute(alternate)}" href="${escapeXml(`${PUBLIC_ORIGIN}${alternate}`)}" />`);
    }
    if (routeToGroup.has(route)) {
      lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${PUBLIC_ORIGIN}${routeToGroup.get(route)[0]}`)}" />`);
    }
    lines.push('  </url>');
  }
  lines.push('</urlset>', '');
  return lines.join('\n');
}

function priorityForRoute(route) {
  if (isHomepage(route)) return '1.0';
  if (/^\/(?:(?:en|ru|da|sv|no)\/)?collection\/[^/]+\//.test(route)) return '0.9';
  if (route.includes('pierre-croizet-cocktails') || route.includes('rencontre')) return '0.8';
  return '0.7';
}

function isHomepage(route) {
  return route === '/' || route === '/en/' || route === '/ru/' || route === '/da/' || route === '/sv/' || route === '/no/';
}

function makeLlmsTxt() {
  return [
    '# Cognac Léopold Croizet',
    '',
    '> Family-owned Cognac house in Triac-Lautrait, Charente, producing Fins Bois cognacs and welcoming visitors by appointment.',
    '',
    'Cognac Léopold Croizet produces and presents VS, VSOP, Napoléon, XO, XO Exception, Extra, Excellence, Héritage and Valentine XO cognacs. The site is available in French, English, Russian, Danish, Swedish and Norwegian.',
    '',
    '## Key Pages',
    '- [French homepage](https://cognac-leopold-croizet.com/): Official French homepage.',
    '- [English homepage](https://cognac-leopold-croizet.com/en/): Official English homepage.',
    '- [Russian homepage](https://cognac-leopold-croizet.com/ru/): Official Russian homepage.',
    '- [Danish homepage](https://cognac-leopold-croizet.com/da/): Official Danish homepage.',
    '- [Swedish homepage](https://cognac-leopold-croizet.com/sv/): Official Swedish homepage.',
    '- [Norwegian homepage](https://cognac-leopold-croizet.com/no/): Official Norwegian homepage.',
    '- [Collection](https://cognac-leopold-croizet.com/collection/): Full Cognac Léopold Croizet range.',
    '- [Visit the cellars](https://cognac-leopold-croizet.com/rencontre/): Visit information in Triac-Lautrait.',
    '- [Cocktails](https://cognac-leopold-croizet.com/pierre-croizet-cocktails/): Cocktail recipes with Cognac and Pineau des Charentes.',
    '',
    '## Product Pages',
    ...[...productNames.keys()].map((slug) => `- [${productNames.get(slug)}](https://cognac-leopold-croizet.com/collection/${slug}/): Cognac Léopold Croizet ${productNames.get(slug)}.`),
    '',
    '## Contact',
    '- Email: cognac@mdpierrre.com',
    '- Phone: +33 5 45 35 88 10',
    "- Address: 30 Route d'Angoulême, 16200 Triac-Lautrait, France",
    '',
  ].join('\n');
}

function makeLlmsFullTxt() {
  return [
    '# Cognac Léopold Croizet: AI Reference',
    '',
    '## Identity',
    'Cognac Léopold Croizet is a family Cognac house based at 30 Route d’Angoulême, 16200 Triac-Lautrait, France. The estate presents a Fins Bois identity, vineyard work, distillation, ageing, blending and cellar visits.',
    '',
    '## Languages',
    '- French: https://cognac-leopold-croizet.com/',
    '- English: https://cognac-leopold-croizet.com/en/',
    '- Russian: https://cognac-leopold-croizet.com/ru/',
    '- Danish: https://cognac-leopold-croizet.com/da/',
    '- Swedish: https://cognac-leopold-croizet.com/sv/',
    '- Norwegian: https://cognac-leopold-croizet.com/no/',
    '',
    '## Cognac Range',
    ...[...productNames.keys()].map((slug) => `- Cognac Léopold Croizet ${productNames.get(slug)}: https://cognac-leopold-croizet.com/collection/${slug}/`),
    '',
    '## Craft Topics',
    '- Vineyard and fruit: https://cognac-leopold-croizet.com/la-matiere/',
    '- Distillation and fire: https://cognac-leopold-croizet.com/le-feu/',
    '- Blending and alchemy: https://cognac-leopold-croizet.com/lalchimie/',
    '- Time and heritage: https://cognac-leopold-croizet.com/le-temps/',
    '- Léopold Croizet interview: https://cognac-leopold-croizet.com/leopold-croizet/',
    '',
    '## Cocktails',
    'The cocktail page presents Charente Spritz, L’Heure Dorée, Ginger d’Or and Golden Melon, using Cognac Léopold Croizet, Pineau des Charentes, melon, ginger beer, lime, basil and honey depending on the recipe.',
    '',
    '## Visit',
    'Cellar visits are available by appointment in Triac-Lautrait: https://cognac-leopold-croizet.com/rencontre/',
    '',
    '## Contact',
    '- cognac@mdpierrre.com',
    '- +33 5 45 35 88 10',
    '',
  ].join('\n');
}

function matchFirst(text, regex) {
  const match = text.match(regex);
  return match ? match[1] : '';
}

function stripTags(value) {
  return String(value || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeXml(value) {
  return escapeHtml(value).replace(/'/g, '&apos;');
}
