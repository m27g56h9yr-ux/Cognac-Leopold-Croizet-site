import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEPLOY_BASE_PATH, normalizeLegacyDeployBase } from './deploy-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_ORIGIN = 'https://cognac-leopold-croizet.com';
const TODAY = '2026-06-11';
const BING_SITE_VERIFICATION = '93401B39EB94158CBBF8CCBDB7119EAE';

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
  ['pineau-des-charentes', 'Pineau des Charentes'],
  ['pineau-des-charentes-rouge', 'Pineau Rouge des Charentes'],
]);

const PINEAU_SLUG = 'pineau-des-charentes';
const PINEAU_RED_SLUG = 'pineau-des-charentes-rouge';

const NEWSLETTER_INPUT_ID = 'newsletter-email';

const productImageAltRules = [
  [/img_prod_xo_exception_home|img_nom_produit_xo-exception/i, 'Cognac Léopold Croizet XO Exception'],
  [/img_produit_vs_base2|VS_2024/i, 'Cognac Léopold Croizet VS'],
  [/img_produit_vsop_base|VSOP_2024/i, 'Cognac Léopold Croizet VSOP'],
  [/img_produit_napoleon_base|NAPOLEON_2024/i, 'Cognac Léopold Croizet Napoléon'],
  [/img_produit_xo_base|XO_2024/i, 'Cognac Léopold Croizet XO'],
  [/extra-bt-|img_nom_produit_extra|img_produit_extra_base/i, 'Cognac Léopold Croizet Extra'],
  [/img_excellence_etui|img_produit_excellence|img_nom_produit_excellence/i, 'Cognac Léopold Croizet Excellence'],
  [/img_produit_heritage|img_nom_produit_heritage/i, 'Cognac Léopold Croizet Héritage'],
  [/img_produit_valentine|img_nom_produit_valentine/i, 'Cognac Léopold Croizet Valentine XO'],
  [/pineau-des-charentes-rouge/i, 'Pineau Rouge des Charentes Léopold Croizet'],
  [/img_produit_pineau_base|img_diapo_pineau|img_nom_produit_pineau/i, 'Pineau des Charentes Léopold Croizet'],
];

const imageDimensionCache = new Map();

function productSeoTitle(slug, lang) {
  const name = productNames.get(slug) || labelFromRoute(`/collection/${slug}/`);
  const isPineau = slug === PINEAU_SLUG || slug === PINEAU_RED_SLUG;
  const titles = isPineau
    ? {
        fr: `${name} Léopold Croizet | Pineau des Charentes`,
        en: `${name} Léopold Croizet | French Pineau`,
        ru: `${name} Léopold Croizet | французский Pineau`,
        da: `${name} Léopold Croizet | fransk Pineau`,
        sv: `${name} Léopold Croizet | fransk Pineau`,
        no: `${name} Léopold Croizet | fransk Pineau`,
        zh: `${name} Léopold Croizet | 法国 Pineau 甜酒`,
      }
    : {
        fr: `${name} Cognac Léopold Croizet | Fins Bois`,
        en: `${name} Cognac Léopold Croizet | Fins Bois`,
        ru: `${name} коньяк Léopold Croizet | Fins Bois`,
        da: `${name} cognac Léopold Croizet | Fins Bois`,
        sv: `${name} cognac Léopold Croizet | Fins Bois`,
        no: `${name} cognac Léopold Croizet | Fins Bois`,
        zh: `${name} 干邑 Léopold Croizet | 法国 Fins Bois`,
      };
  return titles[lang] || titles.fr;
}

const contentGroups = [
  ['/', '/en/', '/ru/', '/da/', '/sv/', '/no/', '/zh/'],
  ['/collection/', '/en/shop/', '/ru/a-faire/', '/da/shop/', '/sv/shop/', '/no/shop/', '/zh/shop/'],
  ['/la-matiere/', '/en/la-matiere/', '/ru/la-matiere/', '/da/la-matiere/', '/sv/la-matiere/', '/no/la-matiere/', '/zh/la-matiere/'],
  ['/le-feu/', '/en/le-feu/', '/ru/le-feu/', '/da/le-feu/', '/sv/le-feu/', '/no/le-feu/', '/zh/le-feu/'],
  ['/lalchimie/', '/en/lalchimie/', '/ru/lalchimie/', '/da/lalchimie/', '/sv/lalchimie/', '/no/lalchimie/', '/zh/lalchimie/'],
  ['/le-temps/', '/en/le-temps/', '/ru/le-temps/', '/da/le-temps/', '/sv/le-temps/', '/no/le-temps/', '/zh/le-temps/'],
  ['/leopold-croizet/', '/en/leopold-croizet/', '/ru/leopold-croizet/', '/da/leopold-croizet/', '/sv/leopold-croizet/', '/no/leopold-croizet/', '/zh/leopold-croizet/'],
  ['/rencontre/', '/en/rencontre/', '/ru/rencontre/', '/da/rencontre/', '/sv/rencontre/', '/no/rencontre/', '/zh/rencontre/'],
  ['/pierre-croizet-cocktails/', '/en/pierre-croizet-cocktails/', '/ru/pierre-croizet-cocktails/', '/da/pierre-croizet-cocktails/', '/sv/pierre-croizet-cocktails/', '/no/pierre-croizet-cocktails/', '/zh/pierre-croizet-cocktails/'],
  ...[...productNames.keys()].map((slug) => [`/collection/${slug}/`, `/en/collection/${slug}/`, `/ru/collection/${slug}/`, `/da/collection/${slug}/`, `/sv/collection/${slug}/`, `/no/collection/${slug}/`, `/zh/collection/${slug}/`]),
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
    title: 'Collection Cognac et Pineau Léopold Croizet | VS, VSOP, XO et Extra',
    description: 'Découvrez la collection Léopold Croizet : Cognacs VS, VSOP, Napoléon, XO, XO Exception, Extra, Excellence, Héritage, Valentine XO, Pineau des Charentes et Pineau Rouge.',
  }],
  ['/en/shop/', {
    title: 'Cognac and Pineau Léopold Croizet Collection | VS, VSOP, XO and Extra',
    description: 'Discover the Léopold Croizet collection: VS, VSOP, Napoléon, XO, XO Exception, Extra, Excellence, Héritage, Valentine XO, Pineau des Charentes and Pineau Rouge.',
  }],
  ['/ru/a-faire/', {
    title: 'Коллекция Cognac и Pineau Léopold Croizet | VS, VSOP, XO и Extra',
    description: 'Откройте коллекцию Léopold Croizet: VS, VSOP, Napoléon, XO, XO Exception, Extra, Excellence, Héritage, Valentine XO, Pineau des Charentes и Pineau Rouge.',
  }],
  ['/da/shop/', {
    title: 'Cognac og Pineau Léopold Croizet Kollektion | VS, VSOP, XO og Extra',
    description: 'Opdag Léopold Croizet kollektionen: VS, VSOP, Napoléon, XO, XO Exception, Extra, Excellence, Héritage, Valentine XO, Pineau des Charentes og Pineau Rouge.',
  }],
  ['/sv/shop/', {
    title: 'Cognac och Pineau Léopold Croizet Kollektion | VS, VSOP, XO och Extra',
    description: 'Upptäck Léopold Croizet kollektionen: VS, VSOP, Napoléon, XO, XO Exception, Extra, Excellence, Héritage, Valentine XO, Pineau des Charentes och Pineau Rouge.',
  }],
  ['/no/shop/', {
    title: 'Cognac og Pineau Léopold Croizet Kolleksjon | VS, VSOP, XO og Extra',
    description: 'Oppdag Léopold Croizet kolleksjonen: VS, VSOP, Napoléon, XO, XO Exception, Extra, Excellence, Héritage, Valentine XO, Pineau des Charentes og Pineau Rouge.',
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
  ['/ru/leopold-croizet/', {
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
  if (slug === PINEAU_SLUG) {
    routeMetadata.set(`/collection/${slug}/`, {
      title: productSeoTitle(slug, 'fr'),
      description: `Découvrez le Pineau des Charentes Léopold Croizet : assemblage d'eaux-de-vie de Cognac et de moûts de raisin, notes de fruits confits, vanille, miel et noix.`,
    });
    routeMetadata.set(`/en/collection/${slug}/`, {
      title: productSeoTitle(slug, 'en'),
      description: `Discover Léopold Croizet Pineau des Charentes: Cognac eaux-de-vie and grape must, with candied fruit, vanilla, honey and walnut notes.`,
    });
    routeMetadata.set(`/ru/collection/${slug}/`, {
      title: productSeoTitle(slug, 'ru'),
      description: `Откройте Pineau des Charentes Léopold Croizet: виноградное сусло и Cognac, ноты цукатов, ванили, меда и ореха.`,
    });
    routeMetadata.set(`/da/collection/${slug}/`, {
      title: productSeoTitle(slug, 'da'),
      description: `Opdag Pineau des Charentes Léopold Croizet: druemost og Cognac med noter af kandiseret frugt, vanilje, honning og valnød.`,
    });
    routeMetadata.set(`/sv/collection/${slug}/`, {
      title: productSeoTitle(slug, 'sv'),
      description: `Upptäck Pineau des Charentes Léopold Croizet: druvmust och Cognac med toner av kanderad frukt, vanilj, honung och valnöt.`,
    });
    routeMetadata.set(`/no/collection/${slug}/`, {
      title: productSeoTitle(slug, 'no'),
      description: `Oppdag Pineau des Charentes Léopold Croizet: druemost og Cognac med toner av kandisert frukt, vanilje, honning og valnøtt.`,
    });
    routeMetadata.set(`/zh/collection/${slug}/`, {
      title: productSeoTitle(slug, 'zh'),
      description: `探索 Pineau des Charentes Léopold Croizet：葡萄汁与 Cognac 调和，呈现蜜饯水果、香草、蜂蜜与核桃香气。`,
    });
    continue;
  }
  if (slug === PINEAU_RED_SLUG) {
    routeMetadata.set(`/collection/${slug}/`, {
      title: productSeoTitle(slug, 'fr'),
      description: `Découvrez le Pineau Rouge des Charentes Léopold Croizet : Merlot, Ugni Blanc, robe rubis, fruits rouges confits, pruneau, épices douces et cacao.`,
    });
    routeMetadata.set(`/en/collection/${slug}/`, {
      title: productSeoTitle(slug, 'en'),
      description: `Discover Léopold Croizet Pineau Rouge des Charentes: Merlot, Ugni Blanc, ruby colour, candied red fruit, prune, gentle spice and cocoa.`,
    });
    routeMetadata.set(`/ru/collection/${slug}/`, {
      title: productSeoTitle(slug, 'ru'),
      description: `Откройте Pineau Rouge des Charentes Léopold Croizet: Merlot, Ugni Blanc, рубиновый цвет, красные ягоды, чернослив, нежные специи и какао.`,
    });
    routeMetadata.set(`/da/collection/${slug}/`, {
      title: productSeoTitle(slug, 'da'),
      description: `Opdag Pineau Rouge des Charentes Léopold Croizet: Merlot, Ugni Blanc, rubinrød farve, kandiserede røde bær, sveske, milde krydderier og kakao.`,
    });
    routeMetadata.set(`/sv/collection/${slug}/`, {
      title: productSeoTitle(slug, 'sv'),
      description: `Upptäck Pineau Rouge des Charentes Léopold Croizet: Merlot, Ugni Blanc, rubinröd färg, kanderade röda bär, katrinplommon, milda kryddor och kakao.`,
    });
    routeMetadata.set(`/no/collection/${slug}/`, {
      title: productSeoTitle(slug, 'no'),
      description: `Oppdag Pineau Rouge des Charentes Léopold Croizet: Merlot, Ugni Blanc, rubinrød farge, kandiserte røde bær, sviske, milde krydder og kakao.`,
    });
    routeMetadata.set(`/zh/collection/${slug}/`, {
      title: productSeoTitle(slug, 'zh'),
      description: `探索 Pineau Rouge des Charentes Léopold Croizet：Merlot、Ugni Blanc、深宝石红酒色、蜜饯红果、西梅、柔和香料与可可。`,
    });
    continue;
  }

  routeMetadata.set(`/collection/${slug}/`, {
    title: productSeoTitle(slug, 'fr'),
    description: `Découvrez Cognac Léopold Croizet ${name} : notes de dégustation, caractère, élevage et savoir-faire d'une maison familiale de Fins Bois.`,
  });
  routeMetadata.set(`/en/collection/${slug}/`, {
    title: productSeoTitle(slug, 'en'),
    description: `Discover Cognac Léopold Croizet ${name}: tasting notes, character, ageing and family know-how from Fins Bois.`,
  });
  routeMetadata.set(`/ru/collection/${slug}/`, {
    title: productSeoTitle(slug, 'ru'),
    description: `Откройте Cognac Léopold Croizet ${name}: дегустационные ноты, характер, выдержка и семейное мастерство Fins Bois.`,
  });
  routeMetadata.set(`/da/collection/${slug}/`, {
    title: productSeoTitle(slug, 'da'),
    description: `Opdag Cognac Léopold Croizet ${name}: smagsnoter, karakter, lagring og familiens savoir-faire fra Fins Bois.`,
  });
  routeMetadata.set(`/sv/collection/${slug}/`, {
    title: productSeoTitle(slug, 'sv'),
    description: `Upptäck Cognac Léopold Croizet ${name}: smaknoter, karaktär, lagring och familjens kunnande från Fins Bois.`,
  });
  routeMetadata.set(`/no/collection/${slug}/`, {
    title: productSeoTitle(slug, 'no'),
    description: `Oppdag Cognac Léopold Croizet ${name}: smaksnoter, karakter, lagring og familiens håndverk fra Fins Bois.`,
  });
  routeMetadata.set(`/zh/collection/${slug}/`, {
    title: productSeoTitle(slug, 'zh'),
    description: `探索 Cognac Léopold Croizet ${name}：品鉴笔记、风格、陈酿与 Fins Bois 家族酒庄的工艺传承。`,
  });
}

const zhRouteMetadata = new Map([
  ['/zh/', {
    title: 'Cognac Léopold Croizet | Fins Bois 家族干邑酒庄',
    description: 'Cognac Léopold Croizet 是位于 Triac-Lautrait、Fins Bois 的家族干邑酒庄，呈现 VS、VSOP、Napoléon、XO 与 Extra 系列干邑、葡萄园工艺与酒窖参观。',
  }],
  ['/zh/shop/', {
    title: 'Cognac 与 Pineau Léopold Croizet 系列 | VS、VSOP、XO 与 Extra',
    description: '探索 Léopold Croizet 系列：VS、VSOP、Napoléon、XO、XO Exception、Extra、Excellence、Héritage、Valentine XO、Pineau des Charentes 与 Pineau Rouge。',
  }],
  ['/zh/la-matiere/', {
    title: '果实 | Cognac Léopold Croizet 葡萄园与风土',
    description: 'Cognac Léopold Croizet 的果实：Fins Bois 风土、有机葡萄园工作、葡萄与 Triac-Lautrait 的采收。',
  }],
  ['/zh/le-feu/', {
    title: '火焰 | Cognac Léopold Croizet 蒸馏',
    description: 'Cognac Léopold Croizet 的火焰：夏朗德双重蒸馏、铜壶蒸馏器、陈酿与酒窖工作的精准。',
  }],
  ['/zh/lalchimie/', {
    title: '调配艺术 | Cognac Léopold Croizet',
    description: 'Cognac Léopold Croizet 的调配艺术：调和、成熟、装瓶与代代相传的家族工艺。',
  }],
  ['/zh/le-temps/', {
    title: '时间 | Cognac Léopold Croizet 传承',
    description: 'Cognac Léopold Croizet 的时间：档案、家族历史、陈酿与世代传承的 savoir-faire。',
  }],
  ['/zh/leopold-croizet/', {
    title: 'Léopold Croizet | 访谈与家族故事',
    description: '走近 Léopold Croizet：家族故事、Triac-Lautrait 酒庄、传承，以及独立干邑酒庄的愿景。',
  }],
  ['/zh/rencontre/', {
    title: '参观 Cognac Léopold Croizet 酒窖 | Triac-Lautrait',
    description: '预约参观位于 Triac-Lautrait、靠近 Jarnac 的 Cognac Léopold Croizet 酒窖，探索家族酒庄。',
  }],
  ['/zh/pierre-croizet-cocktails/', {
    title: 'Cognac Léopold Croizet 鸡尾酒 | 干邑与 Pineau 配方',
    description: "探索 Charente Spritz、L'Heure Dorée、Ginger d'Or 与 Golden Melon，四款以 Cognac Léopold Croizet 与 Pineau des Charentes 调制的鸡尾酒。",
  }],
]);

for (const [route, metadata] of zhRouteMetadata) routeMetadata.set(route, metadata);

const noindexRoutes = new Set([
  '/categorie-produit/non-classe/',
  '/en/categorie-produit/non-classe-en/',
  '/ru/categorie-produit/non-classe-ru/',
  '/da/categorie-produit/non-classe-en/',
  '/sv/categorie-produit/non-classe-en/',
  '/no/categorie-produit/non-classe-en/',
  '/zh/categorie-produit/non-classe-en/',
  '/cgv/',
  '/mentions-legales/',
  '/mon-compte/',
  '/en/my-account/',
  '/ru/mon-compte-2/',
  '/da/my-account/',
  '/sv/my-account/',
  '/no/my-account/',
  '/zh/my-account/',
  '/panier/',
  '/en/cart/',
  '/ru/panier-2/',
  '/da/cart/',
  '/sv/cart/',
  '/no/cart/',
  '/zh/cart/',
  '/collection/pineau-des-charentes-blanc/',
  '/en/checkout/',
  '/ru/validation/',
  '/da/checkout/',
  '/sv/checkout/',
  '/no/checkout/',
  '/zh/checkout/',
]);

function isNoindexRoute(route) {
  return noindexRoutes.has(route) || route.startsWith('/_preview/');
}

const allHtmlFiles = await walkHtml(ROOT);
const existingRoutes = new Set(allHtmlFiles.map((file) => routeForFile(file)));
const routeToGroup = makeGroupMap(existingRoutes);
const indexableRoutes = [];

for (const file of allHtmlFiles) {
  const route = routeForFile(file);
  let html = await readFile(file, 'utf8');
  if (route.startsWith('/_preview/')) {
    const previewHtml = await improveMediaMarkup(
      applyRequestedOrderVisibility(normalizeGithubPagesLinks(html, route), route),
      route,
    );
    await writeFile(file, normalizeLegacyDeployBase(normalizeGeneratedWhitespace(previewHtml)), 'utf8');
    continue;
  }
  html = hardenHtml(html, route, file);
  html = await improveMediaMarkup(html, route);
  await writeFile(file, normalizeLegacyDeployBase(html), 'utf8');
  if (!isNoindexRoute(route)) indexableRoutes.push(route);
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
  if (route.startsWith('/zh/')) return 'zh';
  return 'fr';
}

function localeForRoute(route) {
  return { fr: 'fr_FR', en: 'en_GB', ru: 'ru_RU', da: 'da_DK', sv: 'sv_SE', no: 'nb_NO', zh: 'zh_CN' }[languageForRoute(route)];
}

function htmlLangForRoute(route) {
  const lang = languageForRoute(route);
  return lang === 'zh' ? 'zh-CN' : lang;
}

function hrefLangForRoute(route) {
  const lang = languageForRoute(route);
  return lang === 'zh' ? 'zh-CN' : lang;
}

function hardenHtml(html, route, file) {
  const metadata = routeMetadata.get(route) || fallbackMetadata(route, html);
  const canonical = `${PUBLIC_ORIGIN}${route}`;
  const lang = languageForRoute(route);
  const robots = isNoindexRoute(route) ? 'noindex, follow' : 'index, follow, max-image-preview:large';
  const image = bestImageForPage(html, route);
  const alternates = makeAlternateTags(route);

  let next = html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+name=["']description["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+name=["']keywords["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+name=["']robots["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+name=["']msvalidate\.01["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+rel=["']alternate["'][^>]+hreflang=["'][^"']+["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+hreflang=["'][^"']+["'][^>]+rel=["']alternate["'][^>]*>\s*/gi, '')
    .replace(/<script\b[^>]*id=["']lc-language-router["'][^>]*>[\s\S]*?<\/script>\s*/gi, '')
    .replace(/<style\b[^>]*id=["']lc-price-guard-style["'][^>]*>[\s\S]*?<\/style>\s*/gi, '')
    .replace(/<meta\s+property=["']og:(?:type|title|description|url|image|locale)["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+name=["']twitter:card["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+name=["']twitter:(?:title|description|image)["'][^>]*>\s*/gi, '');

  if (/<html[^>]*lang=/i.test(next)) {
    next = next.replace(/<html([^>]*)lang=["'][^"']*["']([^>]*)>/i, `<html$1lang="${htmlLangForRoute(route)}"$2>`);
  }

  const headBlock = [
    `<title>${escapeHtml(metadata.title)}</title>`,
    `<meta name="description" content="${escapeHtml(metadata.description)}">`,
    keywordsForRoute(route) ? `<meta name="keywords" content="${escapeHtml(keywordsForRoute(route))}">` : '',
    `<meta name="robots" content="${robots}">`,
    `<meta name="msvalidate.01" content="${BING_SITE_VERIFICATION}">`,
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
    priceGuardStyle(),
    languageRouterScript(),
  ].filter(Boolean).join('\n');

  next = next.replace(/<head([^>]*)>/i, `<head$1>\n${headBlock}\n`);
  next = replaceStructuredData(next, route, metadata, image);
  next = repairGeneratedContent(next);
  next = localizeResidualLocaleFragments(next, route);
  next = repairLocalizedSeoHeading(next, route);
  next = repairNewsletterBlock(next, route);
  next = applyRequestedOrderVisibility(next, route);
  next = removeUnavailableOrderControls(next, route);
  next = normalizeGithubPagesLinks(next, route);
  next = repairLanguageMenuLinks(next, route);
  return normalizeGeneratedWhitespace(normalizeLegacyDeployBase(next));
}

function homeHrefForRoute(route) {
  const lang = languageForRoute(route);
  return lang === 'fr' ? `${DEPLOY_BASE_PATH}/` : `${DEPLOY_BASE_PATH}/${lang}/`;
}

function normalizeGithubPagesLinks(html, route) {
  const homeHref = homeHrefForRoute(route);
  const lang = languageForRoute(route);
  const xoExceptionHref = lang === 'fr'
    ? `${DEPLOY_BASE_PATH}/collection/xo-exception/`
    : `${DEPLOY_BASE_PATH}/${lang}/collection/xo-exception/`;
  let next = html
    .replace(/\bhref=(["'])\/\1/gi, (full, quote) => `href=${quote}${homeHref}${quote}`)
    .replace(/https:\/Cognac-Leopold-Croizet-site\//g, `${DEPLOY_BASE_PATH}/`)
    .replace(/https:\/\/raw\.githack\.com\/m27g56h9yr-ux\/Cognac-Leopold-Croizet-site\/codex\/pineau-blanc-page\//g, `${DEPLOY_BASE_PATH}/`)
    .replace(/href=(["'])https?:\/\/cognacg\.cluster028\.hosting\.ovh\.net\/wordpress\/produit\/xo-exception\/\1/gi, (full, quote) => `href=${quote}${xoExceptionHref}${quote}`);

  if (lang !== 'fr') {
    const collectionHref = lang === 'ru' ? `${DEPLOY_BASE_PATH}/ru/a-faire/` : `${DEPLOY_BASE_PATH}/${lang}/shop/`;
    next = next
      .replace(/href=(["'])\/Cognac-Leopold-Croizet-site\/collection\/\1/gi, (full, quote) => `href=${quote}${collectionHref}${quote}`)
      .replace(/href=(["'])\/Cognac-Leopold-Croizet-site\/collection\/([^"']+)\/\1/gi, (full, quote, slug) => `href=${quote}${DEPLOY_BASE_PATH}/${lang}/collection/${slug}/${quote}`)
      .replace(/href=(["'])\/Cognac-Leopold-Croizet-site\/(la-matiere|le-feu|lalchimie|le-temps|leopold-croizet|rencontre|pierre-croizet-cocktails)\/\1/gi, (full, quote, slug) => `href=${quote}${DEPLOY_BASE_PATH}/${lang}/${slug}/${quote}`);

    if (lang === 'ru') {
      next = next.replace(/href=(["'])\/Cognac-Leopold-Croizet-site\/ru\/%d0%bb%d0%b5%d0%be%d0%bf%d0%be%d0%bb%d1%8c%d0%b4%d0%b0-%d0%ba%d1%80%d1%83%d0%b0%d0%b7%d0%b5\/\1/gi, (full, quote) => (
        `href=${quote}${DEPLOY_BASE_PATH}/ru/leopold-croizet/${quote}`
      ));
    }
  }

  return next;
}

function repairLanguageMenuLinks(html, route) {
  const group = routeToGroup.get(route);
  if (!group) return html;

  return html.replace(/<a\b[^>]*\bhreflang=(["'])([^"']+)\1[^>]*>/gi, (tag, quote, hrefLang) => {
    const targetLang = ['zh-Hans', 'zh-CN'].includes(hrefLang) ? 'zh' : hrefLang;
    const alternateRoute = group.find((candidate) => languageForRoute(candidate) === targetLang);
    if (!alternateRoute) return tag;
    const href = `${DEPLOY_BASE_PATH}${alternateRoute}`;
    if (/\bhref=(["'])[^"']*\1/i.test(tag)) {
      return tag.replace(/\bhref=(["'])[^"']*\1/i, (full, hrefQuote) => `href=${hrefQuote}${href}${hrefQuote}`);
    }
    return tag.replace(/<a\b/i, `<a href="${href}"`);
  });
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

function repairGeneratedContent(html) {
  return html
    .replace(/\s*<li\b[^>]*class=["'][^"']*\bheritage\b[^"']*["'][^>]*>\s*<a\b[^>]*href=["'][^"']*\/heritage\/[^"']*["'][\s\S]*?<\/li>\s*/gi, '\n')
    .replace(/href=["'][^"']*\/lost-password\/["']/gi, 'href="#"')
    .replace(/\/wp-content\/uploads\/2021\/11\/img_archive_jeanmarc-fouche%CC%81_mobile\.jpg/g, '/wp-content/uploads/2024/03/img_archive_jeanmarc-fouche_mobile-1.jpg')
    .replace(/Logo Leopold Croizet/g, 'Logo Léopold Croizet')
    .replace(/Leopold Croizet/g, 'Léopold Croizet')
    .replace(/COGNAC PIERRE CROIZET VIDEO/g, 'COGNAC LÉOPOLD CROIZET VIDEO')
    .replace(/Chez les Croizet/g, 'Chez Léopold Croizet')
    .replace(/In the Croizet family/g, 'In the Léopold Croizet family')
    .replace(/to the CROIZET family/g, 'to the Léopold Croizet family')
    .replace(/à la famille CROIZET/g, 'à la famille Léopold Croizet')
    .replace(/CROIZET Frères/g, 'LÉOPOLD CROIZET Frères')
    .replace(/Croizet Frères/g, 'Léopold Croizet Frères')
    .replace(/ETIQUETTE CROIZET/g, 'ETIQUETTE LÉOPOLD CROIZET')
    .replace(/Marc CROIZET/g, 'Marc Léopold Croizet')
    .replace(/Roger CROIZET/g, 'Roger Léopold Croizet')
    .replace(/Leopold CROIZET/g, 'Léopold Croizet')
    .replace(/Léopold CROIZET/g, 'Léopold Croizet')
    .replace(/PIERRE CROIZET/g, 'LÉOPOLD CROIZET')
    .replace(/Pierre CROIZET/g, 'Léopold Croizet')
    .replace(/Pierre Croizet/g, 'Léopold Croizet')
    .replace(/(?:LÉOPOLD\s+)+((?:Etiket|Etikett) (?:for|för) )/g, '$1')
    .replace(/(?:LÉOPOLD\s+){2,}CROIZET/g, 'LÉOPOLD CROIZET')
    .replace(/(?:Léopold\s+){2,}Croizet/g, 'Léopold Croizet');
}

function localizeResidualLocaleFragments(html, route) {
  const lang = languageForRoute(route);
  if (lang === 'fr') return html;

  let next = replaceResidualAgeGate(html, lang);
  next = replaceResidualPremiumCopy(next, lang, route);

  if (lang === 'zh' && route.includes('/collection/')) {
    next = next
      .replace(/<div class="label">Appellation Cognac Contrôlée<span> \| <\/span><\/div>/g, '<div class="label">法定产区名称<span> | </span></div>')
      .replace(/Appellation cognac Fins Bois control[ée]e/gi, 'Fins Bois 干邑受控产区');
  }

  return next;
}

function replaceResidualAgeGate(html, lang) {
  const copy = ageGateCopy(lang);
  if (!copy) return html;

  return html
    .replace(/Pour accéder à notre site,\s*vous devez être en âge d[’']acheter et de consommer de l[’']alcool conformément à la législation en vigueur dans votre pays\/région(?:\s*de résidence)?\.?/g, copy.access)
    .replace(/To access our site, you must be of legal age to purchase and consume alcohol under the laws in force in your country or region of residence\.?/g, copy.access)
    .replace(/Si cette législation n[’']existe pas dans votre pays\/région,\s*vous devez avoir au moins 21 ans\.?/g, copy.fallback)
    .replace(/If no such law exists in your country or region, you must be at least 21 years old\.?/g, copy.fallback)
    .replace(/En cliquant sur «\s*Entrer\s*» vous confirmez avoir l[’']âge requis dans votre pays pour visiter ce site\.?/g, copy.confirm)
    .replace(/By clicking [“"](?:Enter|进入)[”"], you confirm that you are of legal age in your country to visit this site\.?/g, copy.confirm)
    .replace(/Vous acceptez nos <a href="#">Conditions générales d['’]utilisation<\/a> et déclarez avoir lu notre/g, copy.terms)
    .replace(/You accept our <a href="#">terms of use<\/a> and confirm that you have read our/g, copy.terms)
    .replace(/<a href="#">Charte de données personnelles & Cookies<\/a>/g, copy.privacy)
    .replace(/<a href="#">personal data and cookies policy<\/a>/g, copy.privacy)
    .replace(/<button type="submit">Entrer<\/button>/g, `<button type="submit">${copy.enter}</button>`);
}

function ageGateCopy(lang) {
  const copies = {
    en: {
      access: 'To access our site, you must be of legal age to purchase and consume alcohol under the laws in force in your country or region of residence.',
      fallback: 'If no such law exists in your country or region, you must be at least 21 years old.',
      confirm: 'By clicking “Enter”, you confirm that you are of legal age in your country to visit this site.',
      terms: 'You accept our <a href="#">terms of use</a> and confirm that you have read our',
      privacy: '<a href="#">personal data and cookies policy</a>',
      enter: 'Enter',
    },
    ru: {
      access: 'Для доступа к сайту вы должны достичь возраста, с которого в вашей стране или регионе разрешены покупка и употребление алкоголя.',
      fallback: 'Если в вашей стране или регионе такого закона нет, вам должно быть не менее 21 года.',
      confirm: 'Нажимая «Войти», вы подтверждаете, что достигли возраста, необходимого в вашей стране для посещения этого сайта.',
      terms: 'Вы принимаете наши <a href="#">условия использования</a> и подтверждаете, что прочитали нашу',
      privacy: '<a href="#">политику персональных данных и cookies</a>',
      enter: 'Войти',
    },
    da: {
      access: 'For at få adgang til vores site skal du have lovlig alder til at købe og nyde alkohol i henhold til lovgivningen i dit bopælsland eller din region.',
      fallback: 'Hvis der ikke findes en sådan lovgivning i dit land eller din region, skal du være mindst 21 år.',
      confirm: 'Ved at klikke på “Enter” bekræfter du, at du har den krævede alder i dit land for at besøge dette site.',
      terms: 'Du accepterer vores <a href="#">generelle brugsbetingelser</a> og erklærer at have læst vores',
      privacy: '<a href="#">politik for personoplysninger og cookies</a>',
      enter: 'Enter',
    },
    sv: {
      access: 'För att få tillgång till vår webbplats måste du ha laglig ålder för att köpa och konsumera alkohol enligt lagstiftningen i ditt land eller din region.',
      fallback: 'Om sådan lagstiftning saknas i ditt land eller din region måste du vara minst 21 år.',
      confirm: 'Genom att klicka på “Enter” bekräftar du att du har den ålder som krävs i ditt land för att besöka denna webbplats.',
      terms: 'Du accepterar våra <a href="#">allmänna användarvillkor</a> och bekräftar att du har läst vår',
      privacy: '<a href="#">policy för personuppgifter och cookies</a>',
      enter: 'Enter',
    },
    no: {
      access: 'For å få tilgang til nettstedet vårt må du ha lovlig alder til å kjøpe og nyte alkohol i henhold til lovgivningen i landet eller regionen der du bor.',
      fallback: 'Hvis slik lovgivning ikke finnes i landet eller regionen din, må du være minst 21 år.',
      confirm: 'Ved å klikke på “Enter” bekrefter du at du har alderen som kreves i landet ditt for å besøke dette nettstedet.',
      terms: 'Du godtar våre <a href="#">generelle bruksvilkår</a> og bekrefter at du har lest vår',
      privacy: '<a href="#">policy for personopplysninger og cookies</a>',
      enter: 'Enter',
    },
    zh: {
      access: '访问本网站前，您必须达到所在国家或地区法律规定的购买和饮用酒精饮品的法定年龄。',
      fallback: '如果您所在国家或地区没有相关规定，您必须年满 21 岁。',
      confirm: '点击“进入”即表示您确认已达到所在国家或地区访问本网站所需的法定年龄。',
      terms: '您接受我们的 <a href="#">使用条款</a>，并确认已阅读我们的',
      privacy: '<a href="#">个人数据与 Cookie 政策</a>',
      enter: '进入',
    },
  };
  return copies[lang];
}

function replaceResidualPremiumCopy(html, lang, route) {
  let next = html;
  const heritageNote = localizedHeritageNote(lang);
  if (heritageNote) {
    next = next.replace(
      /In its\s+crystal bottle handmade by master craftsmen,[\s\S]*?It[’']s appreciated on tasting for it[’']s intensity and length\./g,
      heritageNote,
    );
    next = next.replace(
      /Presented in a crystal bottle handmade by master craftsmen,[\s\S]*?prized for its intensity and length\./g,
      heritageNote,
    );
  }

  if (route.endsWith('/leopold-croizet/')) {
    const values = localizedValuesInterview(lang);
    if (values) {
      next = next.replace(
        /Respect for tradition, values&#8230;[\s\S]*?motivation to prove myself to be worthy of it\./g,
        values,
      );
      next = next.replace(
        /Respect for tradition and values\. For several generations,[\s\S]*?prove worthy of what I received\./g,
        values,
      );
    }

    const style = localizedStyleInterview(lang);
    if (style) {
      next = next.replace(
        /Difficult\s+for me to describe my cognacs[\s\S]*?range of very interesting aromas\./g,
        style,
      );
      next = next.replace(
        /It is hard for me to describe my cognacs;[\s\S]*?This diversity creates a very interesting aromatic range\./g,
        style,
      );
    }
  }

  return next;
}

function localizedHeritageNote(lang) {
  return {
    en: 'Presented in a crystal bottle handmade by master craftsmen, Héritage is the soul of the house. Four generations of the family have shaped its character with passion. Powerful and slightly animal, its aromatic depth is dense and complex: leather, tobacco and old wood reveal an exceptional rancio, lifted by floral notes and a fresh finish. On tasting, it is prized for its intensity and length.',
    ru: 'В хрустальном графине ручной работы Héritage воплощает душу дома. Четыре поколения семьи с увлечением формировали его характер. Мощный, слегка животный, с густым и сложным ароматом: кожа, табак и старое дерево раскрывают исключительное rancio, дополненное цветочными нотами и свежим финалом. В дегустации он ценится за интенсивность и длину.',
    da: 'I sin håndlavede krystalflaske er Héritage husets sjæl. Fire generationer af familien har med passion formet dens karakter. Kraftfuld og let animalsk, med en tæt og kompleks aromatisk dybde: læder, tobak og gammelt træ afslører en enestående rancio, løftet af florale noter og en frisk afslutning. Ved smagning værdsættes den for sin intensitet og længde.',
    sv: 'I sin handgjorda kristallflaska är Héritage husets själ. Fyra generationer av familjen har med passion format dess karaktär. Kraftfull och lätt animalisk, med tät och komplex aromatisk djup: läder, tobak och gammalt trä avslöjar en exceptionell rancio, lyft av florala toner och en frisk avslutning. Vid provning uppskattas den för sin intensitet och längd.',
    no: 'I sin håndlagde krystallflaske er Héritage husets sjel. Fire generasjoner av familien har med lidenskap formet dens karakter. Kraftfull og lett animalsk, med tett og kompleks aromatisk dybde: lær, tobakk og gammelt tre avslører en eksepsjonell rancio, løftet av florale toner og en frisk avslutning. Ved smaking verdsettes den for intensitet og lengde.',
    zh: 'Héritage 盛装于大师手工制作的水晶瓶中，是酒庄精神的凝结。家族四代人以热情塑造其性格。它强劲、略带动物感，香气浓郁而复杂：皮革、烟草与古老木质显现非凡 rancio，并伴随花香绽放与清新收尾。品饮时以强度与悠长余味见长。',
  }[lang];
}

function localizedValuesInterview(lang) {
  return {
    en: 'Respect for tradition and values. For several generations, my family has carried expertise through every stage of cognac production: from the vineyard to blending, and of course distillation. This mastery allows us to nurture an inheritance for future generations, to look further ahead and to protect product quality. My grandfather Marc launched his cognac brand with his brother just after the Second World War, during a period of reconstruction after difficult years. He thought big, built the business with success, and prevailed. I have many stories about my ancestors; they enrich my vision of the business and motivate me to prove worthy of what I received.',
    zh: '尊重传统与价值。几代以来，我的家族在干邑生产的每一个环节都积累了专业经验：从葡萄藤到调配，当然也包括蒸馏。这种掌握让我们能够滋养并守护一份留给后代的传承，也促使我们看得更远，确保产品品质。我的祖父 Marc 在第二次世界大战后与兄弟一起创立了自己的干邑品牌，那是一个重建的时期，国家刚刚经历艰难岁月。他有远见，也成功建立了事业。我听过许多祖辈的故事，它们丰富了我对事业的理解，也激励我证明自己配得上这份传承。',
  }[lang];
}

function localizedStyleInterview(lang) {
  return {
    en: 'It is hard for me to describe my cognacs; I prefer to let people taste them, because they speak for themselves. As I said earlier, every step matters in making a good cognac. The expertise I carry forward produces very fruity cognacs, typical of the Fins Bois cru. They are fragrant, round, mellow and easy to drink. This roundness comes mainly from distillation on the lees. Our spirits then age in French oak barrels, with wood selected from the finest forests in France. Today this work belongs to my wife, who once worked in cooperage and has a real passion for the dialogue between wood and spirit. This diversity creates a very interesting aromatic range.',
    zh: '对我来说，描述自己的干邑并不容易；我更愿意让人品尝，因为它们会自己表达。正如前面所说，酿造一款好干邑，每一个步骤都很重要。我所传承的技艺带来非常果香充沛的干邑，这是 Fins Bois cru 的典型风格。它们芳香、圆润、柔和，也容易入口。这种圆润主要来自带酒泥蒸馏。随后，生命之水在法国橡木桶中陈酿，木材选自法国最优秀的森林。如今这项工作由我的妻子负责，她曾在制桶行业工作，并真正热爱木材与烈酒之间的互动。这种多样性赋予干邑非常丰富而有趣的香气层次。',
  }[lang];
}

function repairLocalizedSeoHeading(html, route) {
  const heading = productSeoHeading(route);
  if (!heading) return html;
  return html.replace(
    /<h1\b([^>]*)class=(["'])([^"']*\blc-seo-h1\b[^"']*)\2([^>]*)>[\s\S]*?<\/h1>/i,
    (tag, beforeClass, quote, className, afterClass) => `<h1${beforeClass}class=${quote}${className}${quote}${afterClass}>${escapeHtml(heading)}</h1>`,
  );
}

function productSeoHeading(route) {
  const slug = matchFirst(route, /^\/(?:(?:en|ru|da|sv|no|zh)\/)?collection\/([^/]+)\//);
  if (!slug) return '';
  const lang = languageForRoute(route);
  const name = productNames.get(slug) || labelFromRoute(`/collection/${slug}/`);
  const isPineau = slug === PINEAU_SLUG || slug === PINEAU_RED_SLUG;
  if (isPineau) {
    return {
      fr: `${name} Léopold Croizet`,
      en: `${name} Léopold Croizet French Pineau`,
      ru: `${name} Léopold Croizet, французский Pineau`,
      da: `${name} Léopold Croizet, fransk Pineau`,
      sv: `${name} Léopold Croizet, fransk Pineau`,
      no: `${name} Léopold Croizet, fransk Pineau`,
      zh: `${name} Léopold Croizet 法国 Pineau 甜酒`,
    }[lang] || `${name} Léopold Croizet`;
  }

  return {
    fr: `Cognac Léopold Croizet ${name}`,
    en: `Léopold Croizet ${name} Cognac`,
    ru: `${name} коньяк Léopold Croizet`,
    da: `${name} cognac Léopold Croizet`,
    sv: `${name} cognac Léopold Croizet`,
    no: `${name} cognac Léopold Croizet`,
    zh: `${name} 干邑 Léopold Croizet`,
  }[lang] || `Cognac Léopold Croizet ${name}`;
}

function repairNewsletterBlock(html, route) {
  if (!html.includes('container-newsletter')) return html;
  const lang = languageForRoute(route);
  const copy = newsletterCopy(lang);
  return html.replace(
    /<form\b(?=[^>]*class=["'][^"']*\bcontainer-newsletter\b[^"']*["'])[^>]*>[\s\S]*?<\/form>/gi,
    (form) => {
      let next = form
        .replace(
          /<label\b[^>]*>[\s\S]*?<\/label>/i,
          `<label for="${NEWSLETTER_INPUT_ID}">${copy.label}</label>`,
        )
        .replace(
          /<div class="info-legales"[^>]*>[\s\S]*?<\/div>/i,
          `<div class="info-legales" id="${NEWSLETTER_INPUT_ID}-legal">\n        ${copy.legal}\n    </div>`,
        )
        .replace(/<input\b[^>]*name="newsletter"[^>]*>/i, (tag) => {
          let input = tag;
          input = setAttribute(input, 'id', NEWSLETTER_INPUT_ID);
          input = setAttribute(input, 'type', 'email');
          input = setAttribute(input, 'placeholder', copy.placeholder);
          input = setAttribute(input, 'autocomplete', 'email');
          input = setAttribute(input, 'inputmode', 'email');
          input = setAttribute(input, 'aria-describedby', `${NEWSLETTER_INPUT_ID}-legal`);
          return input;
        });

      next = next.replace(
        /(<button\b(?=[^>]*type=["']submit["'])[^>]*>)[\s\S]*?(<\/button>)/i,
        `$1${copy.button}$2`,
      );
      return next;
    },
  );
}


async function improveMediaMarkup(html, route) {
  let next = improveHomepageMediaLoading(html, route);
  next = await improveImageMarkup(next, route);
  return improveVideoMarkup(next, route);
}

function improveHomepageMediaLoading(html, route) {
  if (!isHomepage(route)) return html;
  return html.replace(/"lazyLoad":0/g, '"lazyLoad":1');
}

function improveVideoMarkup(html, route) {
  if (!isHomepage(route)) return html;
  return html.replace(/<video\b[^>]*>/gi, (tag) => {
    let next = tag;
    next = setAttribute(next, 'preload', 'none');
    next = setAttribute(next, 'playsinline', 'playsinline');
    if (!hasAttribute(next, 'aria-hidden')) next = setAttribute(next, 'aria-hidden', 'true');
    return next;
  });
}

async function improveImageMarkup(html, route) {
  let output = '';
  let lastIndex = 0;
  let imageIndex = 0;

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    output += html.slice(lastIndex, match.index);
    output += await improveImageTag(match[0], route, imageIndex);
    lastIndex = match.index + match[0].length;
    imageIndex += 1;
  }

  return output + html.slice(lastIndex);
}

async function improveImageTag(tag, route, imageIndex) {
  const src = getAttribute(tag, 'src') || getAttribute(tag, 'data-src') || '';
  let next = repairProductAlt(tag, src);

  const dimensions = await imageDimensionsForSrc(src);
  if (dimensions) {
    if (!hasAttribute(next, 'width')) next = setAttribute(next, 'width', String(dimensions.width));
    if (!hasAttribute(next, 'height')) next = setAttribute(next, 'height', String(dimensions.height));
  }

  if (!hasAttribute(next, 'decoding') && !/^data:image\/svg\+xml/i.test(src)) {
    next = setAttribute(next, 'decoding', 'async');
  }

  if (shouldLazyLoadImage(next, route, imageIndex)) {
    next = setAttribute(next, 'loading', 'lazy');
  }

  return next;
}

function repairProductAlt(tag, src) {
  const normalizedSrc = normalizePublicPath(src);
  const rule = productImageAltRules.find(([pattern]) => pattern.test(normalizedSrc));
  if (!rule) return tag;
  return setAttribute(tag, 'alt', rule[1]);
}

function shouldLazyLoadImage(tag, route, imageIndex) {
  if (hasAttribute(tag, 'loading') || hasAttribute(tag, 'fetchpriority')) return false;
  if (/skip-lazy|data-skip-lazy|wp-post-image|attachment-woocommerce_single/i.test(tag)) return false;
  if (/logo_leopold_croizet|img_slider_footer_01/i.test(tag)) return false;
  if (isHomepage(route) && imageIndex < 4) return false;
  return true;
}

async function imageDimensionsForSrc(src) {
  const publicPath = normalizePublicPath(src).split('#')[0].split('?')[0];
  if (!publicPath || publicPath.startsWith('data:')) return null;
  if (!/\.(?:png|jpe?g|gif|webp|svg)$/i.test(publicPath)) return null;

  const decodedPath = safeDecodePath(publicPath);
  const localPath = path.join(ROOT, decodedPath.replace(/^\/+/, ''));
  if (imageDimensionCache.has(localPath)) return imageDimensionCache.get(localPath);

  let dimensions = null;
  try {
    const buffer = await readFile(localPath);
    dimensions = parseImageDimensions(localPath, buffer);
  } catch {
    dimensions = null;
  }

  imageDimensionCache.set(localPath, dimensions);
  return dimensions;
}

function parseImageDimensions(file, buffer) {
  if (buffer.length < 24) return null;
  const ext = path.extname(file).toLowerCase();
  if (ext === '.png' && buffer.toString('ascii', 1, 4) === 'PNG') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if ((ext === '.jpg' || ext === '.jpeg') && buffer[0] === 0xff && buffer[1] === 0xd8) {
    return parseJpegDimensions(buffer);
  }
  if (ext === '.gif' && buffer.toString('ascii', 0, 3) === 'GIF') {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  }
  if (ext === '.webp' && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return parseWebpDimensions(buffer);
  }
  if (ext === '.svg') {
    return parseSvgDimensions(buffer.toString('utf8'));
  }
  return null;
}

function parseJpegDimensions(buffer) {
  let offset = 2;
  while (offset < buffer.length - 9) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xda || marker === 0xd9) break;
    const length = buffer.readUInt16BE(offset);
    if (
      (marker >= 0xc0 && marker <= 0xc3)
      || (marker >= 0xc5 && marker <= 0xc7)
      || (marker >= 0xc9 && marker <= 0xcb)
      || (marker >= 0xcd && marker <= 0xcf)
    ) {
      return { height: buffer.readUInt16BE(offset + 3), width: buffer.readUInt16BE(offset + 5) };
    }
    offset += length;
  }
  return null;
}

function parseWebpDimensions(buffer) {
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8X' && buffer.length >= 30) {
    return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
  }
  if (chunk === 'VP8 ' && buffer.length >= 30) {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === 'VP8L' && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

function parseSvgDimensions(svg) {
  const width = numericSvgLength(matchFirst(svg, /\bwidth=["']([^"']+)["']/i));
  const height = numericSvgLength(matchFirst(svg, /\bheight=["']([^"']+)["']/i));
  if (width && height) return { width, height };

  const viewBox = matchFirst(svg, /\bviewBox=["']([^"']+)["']/i);
  if (!viewBox) return null;
  const parts = viewBox.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null;
  return { width: Math.round(parts[2]), height: Math.round(parts[3]) };
}

function numericSvgLength(value) {
  const match = String(value || '').match(/^(\d+(?:\.\d+)?)(?:px)?$/i);
  return match ? Math.round(Number(match[1])) : 0;
}

function safeDecodePath(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function hasAttribute(tag, name) {
  return new RegExp('\\b' + escapeRegExp(name) + '=', 'i').test(tag);
}

function getAttribute(tag, name) {
  const pattern = new RegExp("\\b" + escapeRegExp(name) + "=([\'\\\"])(.*?)\\1", "i");
  return tag.match(pattern)?.[2] || '';
}

function escapeRegExp(value) {
  return String(value).replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}


function setAttribute(tag, name, value) {
  const escapedValue = escapeHtml(String(value));
  const pattern = new RegExp("\\b" + escapeRegExp(name) + "=([\'\\\"]).*?\\1", "i");
  if (pattern.test(tag)) {
    return tag.replace(pattern, name + '="' + escapedValue + '"');
  }
  return tag.replace(/\s*\/?>$/, (end) => ' ' + name + '="' + escapedValue + '"' + (end.trim().startsWith('/') ? ' />' : '>'));
}

function newsletterCopy(lang) {
  const legalHref = `${DEPLOY_BASE_PATH}/mentions-legales/`;
  const copies = {
    fr: {
      label: 'Je souhaite recevoir de vos nouvelles de temps en temps.',
      legal: `En renseignant votre adresse e-mail, vous acceptez de recevoir nos dernières actualités sur nos produits et vous prenez connaissance de nos <a href="${legalHref}">mentions légales</a>.`,
      placeholder: 'Laissez nous votre e-mail',
      button: 'Envoyer',
    },
    en: {
      label: 'I would like to receive news from you from time to time.',
      legal: `By entering your email address, you agree to receive our latest news about our products and acknowledge our <a href="${legalHref}">legal notices</a>.`,
      placeholder: 'Leave us your email',
      button: 'Send',
    },
    ru: {
      label: 'Я хочу время от времени получать ваши новости.',
      legal: `Указывая свой e-mail, вы соглашаетесь получать наши последние новости о продуктах и подтверждаете, что ознакомились с нашими <a href="${legalHref}">правовыми уведомлениями</a>.`,
      placeholder: 'Оставьте ваш e-mail',
      button: 'Отправить',
    },
    da: {
      label: 'Jeg ønsker at modtage nyheder fra jer fra tid til anden.',
      legal: `Ved at indtaste din e-mailadresse accepterer du at modtage vores seneste nyheder om vores produkter og bekræfter, at du har læst vores <a href="${legalHref}">juridiske meddelelser</a>.`,
      placeholder: 'Skriv din e-mail',
      button: 'Send',
    },
    sv: {
      label: 'Jag vill få nyheter från er då och då.',
      legal: `Genom att ange din e-postadress godkänner du att få våra senaste nyheter om våra produkter och bekräftar att du har tagit del av våra <a href="${legalHref}">juridiska meddelanden</a>.`,
      placeholder: 'Lämna din e-postadress',
      button: 'Skicka',
    },
    no: {
      label: 'Jeg ønsker å motta nyheter fra dere fra tid til annen.',
      legal: `Ved å oppgi e-postadressen din godtar du å motta våre siste nyheter om produktene våre og bekrefter at du har lest våre <a href="${legalHref}">juridiske merknader</a>.`,
      placeholder: 'Legg igjen e-posten din',
      button: 'Send',
    },
    zh: {
      label: '我希望不时收到来自酒庄的消息。',
      legal: `填写电子邮箱即表示您同意接收我们关于产品的最新资讯，并确认已阅读我们的 <a href="${legalHref}">法律声明</a>。`,
      placeholder: '请输入您的电子邮箱',
      button: '发送',
    },
  };
  return copies[lang] || copies.fr;
}

function keywordsForRoute(route) {
  if (languageForRoute(route) !== 'zh') return '';
  const slug = matchFirst(route, /^\/zh\/collection\/([^/]+)\//);
  const product = productNames.get(slug);
  const base = [
    'Cognac Léopold Croizet',
    'Léopold Croizet 干邑',
    '法国干邑',
    '干邑酒庄',
    '法国白兰地',
    'Fins Bois',
    '夏朗德干邑',
    '法国烈酒',
  ];
  if (product) base.push(productFullName(slug), `Léopold Croizet ${product}`);
  if (route.includes('pierre-croizet-cocktails')) base.push('干邑鸡尾酒', 'Pineau des Charentes 鸡尾酒');
  if (route.includes('rencontre')) base.push('法国干邑酒窖参观', 'Triac-Lautrait');
  return base.join(', ');
}


function applyRequestedOrderVisibility(html, route) {
  let next = isHomepage(route) ? removeCartNavigationItem(html) : html;
  const lang = languageForRoute(route);
  if (lang === 'fr' || lang === 'en' || route.startsWith('/_preview/')) {
    next = removeInternalOrderButtons(next);
  }
  return next;
}

function removeCartNavigationItem(html) {
  return html.replace(/\s*<li\b[^>]*class=["'][^"']*\bpanier-menu\b[^"']*["'][\s\S]*?<\/li>\s*/gi, '\n');
}

function removeInternalOrderButtons(html) {
  const localHrefPattern = String.raw`/(?:Cognac-Leopold-Croizet-site/)?[^"']*`;
  const buttonPattern = (className) => new RegExp(
    String.raw`\s*<a\b(?=[^>]*class=["'][^"']*\b${className}\b[^"']*["'])(?=[^>]*href=["']${localHrefPattern}["'])[^>]*>[\s\S]*?</a>\s*`,
    'gi',
  );
  return html
    .replace(buttonPattern('btn-commander-produit'), '\n')
    .replace(buttonPattern('commander-produit'), '\n');
}

function removeUnavailableOrderControls(html, route) {
  const isRussianExternalClient = route.startsWith('/ru/');
  const isChineseNoPriceMarket = route.startsWith('/zh/');
  if (!isRussianExternalClient && !isChineseNoPriceMarket) return html;

  let next = html
    .replace(/\s*<li\b[^>]*class=["'][^"']*\bpanier-menu\b[^"']*["'][\s\S]*?<\/li>\s*/gi, '\n')
    .replace(/\s*<form\b[^>]*class=["'][^"']*\bcart\b[^"']*["'][\s\S]*?<\/form>\s*/gi, '\n')
    .replace(/\s*<button\b[^>]*class=["'][^"']*\bsingle_add_to_cart_button\b[^"']*["'][\s\S]*?<\/button>\s*/gi, '\n');

  if (isChineseNoPriceMarket) {
    next = next
      .replace(/\s*<div\b[^>]*class=["'][^"']*\bcontainer-btn-commander-produit\b[^"']*["'][\s\S]*?<\/div>\s*/gi, '\n')
      .replace(/\s*<a\b[^>]*class=["'][^"']*\bcommander-produit\b[^"']*["'][\s\S]*?<\/a>\s*/gi, '\n');
  }

  return next;
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
  if (route === '/' || route === '/en/' || route === '/ru/' || route === '/da/' || route === '/sv/' || route === '/no/' || route === '/zh/') return '/wp-content/uploads/2024/03/img_slider_footer_01.png';
  if (route.includes('pierre-croizet-cocktails')) return '/wp-content/uploads/2026/06/cocktails/heure-doree-scene.jpg';
  if (/^\/(?:(?:en|ru|da|sv|no|zh)\/)?collection\/pineau-des-charentes\/$/.test(route)) return '/wp-content/uploads/2021/06/img_diapo_pineau-01.jpg';
  if (/^\/(?:(?:en|ru|da|sv|no|zh)\/)?collection\/pineau-des-charentes-rouge\/$/.test(route)) return '/wp-content/uploads/2026/06/pineau-des-charentes-rouge.png';
  if (/^\/(?:(?:en|ru|da|sv|no|zh)\/)?collection\/extra\/$/.test(route)) return '/wp-content/uploads/2026/06/extra-bt-devant-coffret.png';
  if (/^\/(?:(?:en|ru|da|sv|no|zh)\/)?collection\/excellence\/$/.test(route)) return '/wp-content/uploads/2026/06/img_excellence_etui.jpg';
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
  if (!group) return [`<link rel="alternate" hreflang="${hrefLangForRoute(route)}" href="${PUBLIC_ORIGIN}${route}">`];
  const tags = group.map((alternateRoute) => (
    `<link rel="alternate" hreflang="${hrefLangForRoute(alternateRoute)}" href="${PUBLIC_ORIGIN}${alternateRoute}">`
  ));
  tags.push(`<link rel="alternate" hreflang="x-default" href="${PUBLIC_ORIGIN}${xDefaultRoute(group)}">`);
  return tags;
}

function xDefaultRoute(group) {
  return group.find((route) => route === '/en/' || route.startsWith('/en/')) || group[0];
}

function priceGuardStyle() {
  return `<style id="lc-price-guard-style">html.lc-hide-prices .prix-produit-container,html.lc-hide-prices .prix-produit-collection,html.lc-hide-prices .price,html.lc-hide-prices .woocommerce-Price-amount,html.lc-hide-prices .amount,html.lc-hide-prices form.cart,html.lc-hide-prices li.panier-menu,html.lc-hide-prices .container-btn-commander-produit,html.lc-hide-prices .commander-produit,html.lc-hide-prices .single_add_to_cart_button{display:none!important}</style>`;
}

function languageRouterScript() {
  const script = `(function(){
var supported={fr:"/",en:"/en/",ru:"/ru/",da:"/da/",sv:"/sv/",no:"/no/",zh:"/zh/"};
var aliases={nb:"no",nn:"no",zhhans:"zh",zhcn:"zh"};
var regionLanguage={FR:"fr",MC:"fr",BE:"fr",CH:"fr",CA:"fr",LU:"fr",HT:"fr",BJ:"fr",BF:"fr",BI:"fr",CM:"fr",CF:"fr",TD:"fr",KM:"fr",CG:"fr",CD:"fr",CI:"fr",DJ:"fr",GA:"fr",GN:"fr",GQ:"fr",MG:"fr",ML:"fr",NE:"fr",RW:"fr",SN:"fr",SC:"fr",TG:"fr",MU:"fr",MR:"fr",MA:"fr",DZ:"fr",TN:"fr",LB:"fr",VU:"fr",GF:"fr",GP:"fr",MQ:"fr",RE:"fr",YT:"fr",NC:"fr",PF:"fr",PM:"fr",WF:"fr",BL:"fr",MF:"fr",RU:"ru",DK:"da",SE:"sv",NO:"no",CN:"zh",HK:"zh",MO:"zh",TW:"zh"};
var chinaRegions={CN:1,HK:1,MO:1,TW:1};
var chinaTimeZones={"Asia/Shanghai":1,"Asia/Urumqi":1,"Asia/Hong_Kong":1,"Asia/Macau":1,"Asia/Taipei":1};
var storageKey="lcPreferredLanguage";
var chinaStorageKey="lcChinaVisitor";
var deployBase=${JSON.stringify(DEPLOY_BASE_PATH)};
var crawlerPattern=/(bot|crawler|spider|slurp|bingpreview|yandex|baiduspider|duckduckbot|facebookexternalhit|twitterbot|linkedinbot|embedly|ia_archiver|gptbot|chatgpt-user|perplexitybot|claudebot|anthropic-ai|applebot)/i;
function activeBase(){var path=window.location.pathname;return path===deployBase||path.indexOf(deployBase+"/")===0?deployBase:""}
function routeFor(pathname){var base=activeBase();var route=pathname;if(base&&route.indexOf(base)===0)route=route.slice(base.length)||"/";route=route.replace(/\\/index\\.html$/,"/");if(route.charAt(0)!=="/")route="/"+route;return route||"/"}
function normalizeLang(tag){var clean=String(tag||"").toLowerCase().replace(/[-_]/g,"");var code=String(tag||"").toLowerCase().split(/[-_]/)[0];return aliases[clean]||aliases[code]||(supported[code]?code:"")}
function regionFor(tag){try{var locale=new Intl.Locale(tag);if(locale.region)return locale.region.toUpperCase()}catch(error){}var match=String(tag||"").match(/[-_]([a-z]{2}|\\d{3})\\b/i);return match?match[1].toUpperCase():""}
function browserTags(){return navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||navigator.userLanguage||""]}
function detectsChina(){var list=browserTags();for(var i=0;i<list.length;i++){if(normalizeLang(list[i])==="zh")return true;if(chinaRegions[regionFor(list[i])])return true}try{var tz=Intl.DateTimeFormat().resolvedOptions().timeZone;if(chinaTimeZones[tz])return true}catch(error){}return false}
function browserLang(){var list=browserTags();for(var i=0;i<list.length;i++){var direct=normalizeLang(list[i]);if(direct)return direct;var region=regionFor(list[i]);if(regionLanguage[region])return regionLanguage[region]}return"en"}
function preferredLang(){if(detectsChina())return"zh";try{var saved=window.localStorage&&localStorage.getItem(storageKey);if(saved&&supported[saved])return saved}catch(error){}return browserLang()}
function rememberLang(lang){if(!supported[lang])return;try{window.localStorage&&localStorage.setItem(storageKey,lang)}catch(error){}}
function isCrawler(){return crawlerPattern.test(String(navigator.userAgent||""))}
function hasChinaFlag(){try{return window.localStorage&&localStorage.getItem(chinaStorageKey)==="1"}catch(error){return false}}
function setChinaFlag(){try{window.localStorage&&localStorage.setItem(chinaStorageKey,"1")}catch(error){}}
function hidePricesNow(){var items=document.querySelectorAll(".prix-produit-container,.prix-produit-collection,.price,.woocommerce-Price-amount,.amount,form.cart,li.panier-menu,.container-btn-commander-produit,.commander-produit,.single_add_to_cart_button");for(var i=0;i<items.length;i++)items[i].remove()}
var route=routeFor(window.location.pathname);
var chinaVisitor=detectsChina();
if(chinaVisitor)setChinaFlag();
if(chinaVisitor||hasChinaFlag()||route.indexOf("/zh/")===0){document.documentElement.classList.add("lc-hide-prices");if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",hidePricesNow)}else{hidePricesNow()}}
document.addEventListener("click",function(event){var target=event.target&&event.target.closest?event.target.closest("a[hreflang]"):null;if(!target)return;var lang=normalizeLang(target.getAttribute("hreflang"));if(lang)rememberLang(lang)},true);
if(isCrawler()||route!=="/"||/(?:^|[?&])lc_no_redirect=1(?:&|$)/.test(window.location.search))return;
var lang=preferredLang();
var targetRoute=supported[lang]||supported.en;
if(targetRoute===route)return;
window.location.replace(activeBase()+targetRoute+window.location.search+window.location.hash)
})();`;
  return `<script id="lc-language-router">${script}</script>`;
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
    alternateName: ['Maison Léopold Croizet', 'Maison Cognac Léopold Croizet', 'Léopold Croizet 干邑', '法国 Léopold Croizet 干邑酒庄'],
    url: PUBLIC_ORIGIN,
    logo: `${PUBLIC_ORIGIN}/wp-content/uploads/2024/03/logo_leopold_croizet_footer_02.svg`,
    image: `${PUBLIC_ORIGIN}/wp-content/uploads/2024/03/img_slider_footer_01.png`,
    knowsAbout: ['Cognac', 'Fins Bois', 'Pineau des Charentes', 'French spirits', '法国干邑', '干邑鸡尾酒'],
    email: 'cognac@mdpierre.com',
    telephone: '+33545358810',
    address: {
      '@type': 'PostalAddress',
      streetAddress: "30 Rue d'Angoulême",
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
    inLanguage: ['fr', 'en', 'ru', 'da', 'sv', 'no', 'zh-CN'],
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
    inLanguage: htmlLangForRoute(route),
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
  const slug = matchFirst(route, /^\/(?:(?:en|ru|da|sv|no|zh)\/)?collection\/([^/]+)\//);
  const name = productNames.get(slug);
  if (!name) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productFullName(slug),
    description: metadata.description,
    image: image ? `${PUBLIC_ORIGIN}${image}` : undefined,
    category: productCategory(slug),
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
  return names.map(([name, ingredients]) => {
    const localizedIngredients = recipeIngredients(lang, name, ingredients);
    return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name,
    description: recipeDescription(lang, name, localizedIngredients),
    recipeIngredient: localizedIngredients.split(', '),
    author: { '@id': `${PUBLIC_ORIGIN}/#organization` },
    image: `${PUBLIC_ORIGIN}/wp-content/uploads/2026/06/cocktails/heure-doree-scene.jpg`,
    inLanguage: lang,
  };
  });
}

function recipeIngredients(lang, name, ingredients) {
  if (lang !== 'zh') return ingredients;
  return {
    'Charente Spritz': 'Pineau Rosé des Charentes, Cognac Léopold Croizet VS, 夏朗德甜瓜, 气泡水',
    "L'Heure Dorée": 'Pineau Blanc des Charentes, Cognac Léopold Croizet VS, 夏朗德甜瓜, 罗勒, 青柠',
    "Ginger d'Or": 'Cognac Léopold Croizet, 姜汁啤酒, 青柠',
    'Golden Melon': 'Cognac Léopold Croizet VSOP, Vieux Pineau des Charentes, 甜瓜, 洋槐蜜',
  }[name] || ingredients;
}

function recipeDescription(lang, name, ingredients) {
  if (lang === 'ru') return `${name}: коктейль с ${ingredients}.`;
  if (lang === 'zh') return `${name}：以 ${ingredients} 调制的鸡尾酒。`;
  if (lang === 'en') return `${name}: cocktail with ${ingredients}.`;
  if (lang === 'da') return `${name}: cocktail med ${ingredients}.`;
  if (lang === 'sv') return `${name}: cocktail med ${ingredients}.`;
  if (lang === 'no') return `${name}: cocktail med ${ingredients}.`;
  return `${name} : cocktail avec ${ingredients}.`;
}

function makeRobots() {
  return [
    'User-agent: Baiduspider',
    'Allow: /',
    '',
    'User-agent: Sogou web spider',
    'Allow: /',
    '',
    'User-agent: 360Spider',
    'Allow: /',
    '',
    'User-agent: Bytespider',
    'Allow: /',
    '',
    'User-agent: PetalBot',
    'Allow: /',
    '',
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
      lines.push(`    <xhtml:link rel="alternate" hreflang="${hrefLangForRoute(alternate)}" href="${escapeXml(`${PUBLIC_ORIGIN}${alternate}`)}" />`);
    }
    if (routeToGroup.has(route)) {
      lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${PUBLIC_ORIGIN}${xDefaultRoute(routeToGroup.get(route))}`)}" />`);
    }
    lines.push('  </url>');
  }
  lines.push('</urlset>', '');
  return lines.join('\n');
}

function priorityForRoute(route) {
  if (isHomepage(route)) return '1.0';
  if (/^\/(?:(?:en|ru|da|sv|no|zh)\/)?collection\/[^/]+\//.test(route)) return '0.9';
  if (route.includes('pierre-croizet-cocktails') || route.includes('rencontre')) return '0.8';
  return '0.7';
}

function isHomepage(route) {
  return route === '/' || route === '/en/' || route === '/ru/' || route === '/da/' || route === '/sv/' || route === '/no/' || route === '/zh/';
}

function makeLlmsTxt() {
  return [
    '# Cognac Léopold Croizet',
    '',
    '> Family-owned Cognac house in Triac-Lautrait, Charente, producing Fins Bois cognacs and welcoming visitors by appointment.',
    '',
    'Cognac Léopold Croizet produces and presents VS, VSOP, Napoléon, XO, XO Exception, Extra, Excellence, Héritage and Valentine XO cognacs, plus Pineau des Charentes. The site is available in French, English, Russian, Danish, Swedish, Norwegian and Simplified Chinese.',
    '',
    '## Key Pages',
    '- [French homepage](https://cognac-leopold-croizet.com/): Official French homepage.',
    '- [English homepage](https://cognac-leopold-croizet.com/en/): Official English homepage.',
    '- [Russian homepage](https://cognac-leopold-croizet.com/ru/): Official Russian homepage.',
    '- [Danish homepage](https://cognac-leopold-croizet.com/da/): Official Danish homepage.',
    '- [Swedish homepage](https://cognac-leopold-croizet.com/sv/): Official Swedish homepage.',
    '- [Norwegian homepage](https://cognac-leopold-croizet.com/no/): Official Norwegian homepage.',
    '- [Chinese homepage](https://cognac-leopold-croizet.com/zh/): Official Simplified Chinese homepage.',
    '- [Chinese collection](https://cognac-leopold-croizet.com/zh/shop/): Simplified Chinese Cognac Léopold Croizet range, without public prices.',
    '- [Collection](https://cognac-leopold-croizet.com/collection/): Full Cognac Léopold Croizet range.',
    '- [Visit the cellars](https://cognac-leopold-croizet.com/rencontre/): Visit information in Triac-Lautrait.',
    '- [Cocktails](https://cognac-leopold-croizet.com/pierre-croizet-cocktails/): Cocktail recipes with Cognac and Pineau des Charentes.',
    '',
    '## Product Pages',
    ...[...productNames.keys()].map((slug) => `- [${productNames.get(slug)}](https://cognac-leopold-croizet.com/collection/${slug}/): ${productFullName(slug)}.`),
    '',
    '## Contact',
    '- Email: cognac@mdpierre.com',
    '- Phone: +33 5 45 35 88 10',
    "- Address: 30 Rue d'Angoulême, 16200 Triac-Lautrait, France",
    '',
  ].join('\n');
}

function makeLlmsFullTxt() {
  return [
    '# Cognac Léopold Croizet: AI Reference',
    '',
    '## Identity',
    "Cognac Léopold Croizet is a family Cognac house based at 30 Rue d'Angoulême, 16200 Triac-Lautrait, France. The estate presents a Fins Bois identity, vineyard work, distillation, ageing, blending and cellar visits.",
    '',
    '## Languages',
    '- French: https://cognac-leopold-croizet.com/',
    '- English: https://cognac-leopold-croizet.com/en/',
    '- Russian: https://cognac-leopold-croizet.com/ru/',
    '- Danish: https://cognac-leopold-croizet.com/da/',
    '- Swedish: https://cognac-leopold-croizet.com/sv/',
    '- Norwegian: https://cognac-leopold-croizet.com/no/',
    '- Simplified Chinese: https://cognac-leopold-croizet.com/zh/',
    '',
    '## Simplified Chinese Search Context',
    'The Chinese version uses zh-CN metadata and presents Cognac Léopold Croizet as a French cognac house from Fins Bois. Relevant Chinese concepts include 法国干邑, 干邑酒庄, 法国白兰地, Fins Bois, 干邑鸡尾酒, 酒窖参观 and Triac-Lautrait. Product pages in Chinese intentionally do not display prices.',
    '',
    '## Collection',
    ...[...productNames.keys()].map((slug) => `- ${productFullName(slug)}: https://cognac-leopold-croizet.com/collection/${slug}/`),
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
    '- cognac@mdpierre.com',
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

function productFullName(slug) {
  const name = productNames.get(slug) || labelFromRoute(`/collection/${slug}/`);
  return slug === PINEAU_SLUG || slug === PINEAU_RED_SLUG ? `${name} Léopold Croizet` : `Cognac Léopold Croizet ${name}`;
}

function productCategory(slug) {
  return slug === PINEAU_SLUG || slug === PINEAU_RED_SLUG ? 'Pineau des Charentes' : 'Cognac';
}

function escapeXml(value) {
  return escapeHtml(value).replace(/'/g, '&apos;');
}
