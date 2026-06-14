import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_ORIGIN = 'https://cognac-leopold-croizet.com';

const cocktailPages = [
  {
    route: '/pierre-croizet-cocktails/',
    file: 'pierre-croizet-cocktails/index.html',
    lang: 'fr',
    title: 'Cocktails Cognac Léopold Croizet | Old Fashioned, French Mojito, Summit',
    description: 'Découvrez Old Fashioned, French Mojito et Summit, trois cocktails à préparer avec les cognacs Léopold Croizet VS ou VSOP.',
  },
  {
    route: '/en/pierre-croizet-cocktails/',
    file: 'en/pierre-croizet-cocktails/index.html',
    lang: 'en',
    title: 'Cognac Léopold Croizet Cocktails | Old Fashioned, French Mojito, Summit',
    description: 'Discover Old Fashioned, French Mojito and Summit, three cocktails to prepare with Cognac Léopold Croizet VS or VSOP.',
  },
  {
    route: '/ru/pierre-croizet-cocktails/',
    file: 'ru/pierre-croizet-cocktails/index.html',
    lang: 'ru',
    title: 'Коктейли Cognac Léopold Croizet | Old Fashioned, French Mojito, Summit',
    description: 'Откройте Old Fashioned, French Mojito и Summit, три коктейля с Cognac Léopold Croizet VS или VSOP.',
  },
  {
    route: '/da/pierre-croizet-cocktails/',
    file: 'da/pierre-croizet-cocktails/index.html',
    lang: 'da',
    title: 'Cognac Léopold Croizet cocktails | Old Fashioned, French Mojito, Summit',
    description: 'Opdag Old Fashioned, French Mojito og Summit, tre cocktails med Cognac Léopold Croizet VS eller VSOP.',
  },
  {
    route: '/sv/pierre-croizet-cocktails/',
    file: 'sv/pierre-croizet-cocktails/index.html',
    lang: 'sv',
    title: 'Cognac Léopold Croizet cocktails | Old Fashioned, French Mojito, Summit',
    description: 'Upptäck Old Fashioned, French Mojito och Summit, tre cocktails med Cognac Léopold Croizet VS eller VSOP.',
  },
  {
    route: '/no/pierre-croizet-cocktails/',
    file: 'no/pierre-croizet-cocktails/index.html',
    lang: 'no',
    title: 'Cognac Léopold Croizet cocktails | Old Fashioned, French Mojito, Summit',
    description: 'Oppdag Old Fashioned, French Mojito og Summit, tre cocktails med Cognac Léopold Croizet VS eller VSOP.',
  },
  {
    route: '/zh/pierre-croizet-cocktails/',
    file: 'zh/pierre-croizet-cocktails/index.html',
    lang: 'zh-Hans',
    title: 'Cognac Léopold Croizet 鸡尾酒 | Old Fashioned, French Mojito, Summit',
    description: '探索 Old Fashioned、French Mojito 与 Summit，三款以 Cognac Léopold Croizet VS 或 VSOP 调制的鸡尾酒。',
  },
];

await main();

async function main() {
  let updated = 0;

  for (const page of cocktailPages) {
    const filePath = path.join(ROOT, page.file);

    if (!(await exists(filePath))) {
      console.log(`Skipping ${page.file}: file not found`);
      continue;
    }

    const original = await readFile(filePath, 'utf8');
    const cocktails = parseVisibleCocktails(original);

    if (cocktails.length === 0) {
      console.log(`Skipping ${page.file}: no visible cocktail blocks found`);
      continue;
    }

    const withMeta = replaceHeadMeta(original, page, cocktails);
    const withSchema = replaceJsonLd(withMeta, page, cocktails);

    if (withSchema !== original) {
      await writeFile(filePath, withSchema);
      updated += 1;
      console.log(`Aligned cocktail Recipe schema for ${page.file}: ${cocktails.map((cocktail) => cocktail.name).join(', ')}`);
    }
  }

  console.log(`Cocktail schema hardening complete: ${updated} page(s) updated`);
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function parseVisibleCocktails(html) {
  const startPattern = /<div\b[^>]*class=(["'])[^"']*\bcontainer-cocktail-unique\b[^"']*\1[^>]*>/gi;
  const starts = [...html.matchAll(startPattern)];
  const cocktails = [];

  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index].index ?? 0;
    const nextStart = starts[index + 1]?.index ?? html.length;
    const block = html.slice(start, nextStart);
    const name = textFromHtml(extractClassContent(block, 'h2', 'nom-cocktail'));
    const ingredients = linesFromHtml(extractClassContent(block, 'div', 'ingredients-cocktail'));
    const instructions = linesFromHtml(extractClassContent(block, 'div', 'recette-cocktail'));
    const image = extractImage(block);

    if (name && ingredients.length > 0) {
      cocktails.push({ name, ingredients, instructions, image });
    }
  }

  return cocktails;
}

function extractClassContent(fragment, tag, className) {
  const pattern = new RegExp(`<${tag}\\b[^>]*class=(["'])[^"']*\\b${escapeRegex(className)}\\b[^"']*\\1[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = fragment.match(pattern);
  return match ? match[2] : '';
}

function extractImage(fragment) {
  const match = fragment.match(/<img\b[^>]*src=(["'])([^"']+)\1[^>]*>/i);
  return match ? match[2] : '';
}

function replaceHeadMeta(html, page, cocktails) {
  const image = absoluteUrl(cocktails.find((cocktail) => cocktail.image)?.image || '');
  let output = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`);

  output = replaceMetaContent(output, 'name', 'description', page.description);
  output = replaceMetaContent(output, 'property', 'og:title', page.title);
  output = replaceMetaContent(output, 'property', 'og:description', page.description);
  output = replaceMetaContent(output, 'name', 'twitter:title', page.title);
  output = replaceMetaContent(output, 'name', 'twitter:description', page.description);

  if (image) {
    output = replaceMetaContent(output, 'property', 'og:image', image);
    output = replaceMetaContent(output, 'name', 'twitter:image', image);
  }

  return output;
}

function replaceMetaContent(html, attrName, attrValue, content) {
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\b${attrName}=(["'])${escapeRegex(attrValue)}\\1)[^>]*>`, 'i');

  if (!pattern.test(html)) return html;

  return html.replace(pattern, (tag) => {
    const escaped = escapeAttr(content);

    if (/\bcontent=(["'])[\s\S]*?\1/i.test(tag)) {
      return tag.replace(/\bcontent=(["'])[\s\S]*?\1/i, `content="${escaped}"`);
    }

    return tag.replace(/\s*\/?>$/, ` content="${escaped}">`);
  });
}

function replaceJsonLd(html, page, cocktails) {
  const parsedSchemas = [];
  const cleanedHtml = html.replace(/<script\b(?=[^>]*type=(["'])application\/ld\+json\1)[^>]*>([\s\S]*?)<\/script>\s*/gi, (_block, _quote, rawJson) => {
    try {
      parsedSchemas.push(...schemasFromJsonLd(JSON.parse(rawJson.trim())));
    } catch (error) {
      console.warn(`Dropping invalid JSON-LD on ${page.file}: ${error.message}`);
    }

    return '';
  });
  const pageUrl = `${PUBLIC_ORIGIN}${page.route}`;
  const image = absoluteUrl(cocktails.find((cocktail) => cocktail.image)?.image || '');
  const schemas = parsedSchemas.filter((schema) => !hasSchemaType(schema, 'Recipe'));

  for (const schema of schemas) {
    if (hasSchemaType(schema, 'WebPage')) {
      schema['@id'] = `${pageUrl}#webpage`;
      schema.url = pageUrl;
      schema.name = page.title;
      schema.description = page.description;
      schema.inLanguage = page.lang;
      schema.primaryImageOfPage = image ? { '@type': 'ImageObject', url: image } : schema.primaryImageOfPage;
    }

    if (hasSchemaType(schema, 'BreadcrumbList') && Array.isArray(schema.itemListElement)) {
      const currentPageCrumb = schema.itemListElement.find((item) => item.position === 2);

      if (currentPageCrumb) {
        currentPageCrumb.name = 'Léopold Croizet Cocktails';
        currentPageCrumb.item = pageUrl;
      }
    }
  }

  const recipeSchemas = cocktails.map((cocktail) => buildRecipeSchema(page, cocktail));
  const jsonLd = JSON.stringify([...schemas, ...recipeSchemas]);
  const block = `<script type="application/ld+json">${jsonLd}</script>\n`;

  return cleanedHtml.replace(/<\/head>/i, `${block}</head>`);
}

function schemasFromJsonLd(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap((item) => schemasFromJsonLd(item));
  if (Array.isArray(value['@graph'])) return value['@graph'].flatMap((item) => schemasFromJsonLd(item));
  return [value];
}

function hasSchemaType(schema, typeName) {
  const type = schema?.['@type'];

  if (Array.isArray(type)) return type.includes(typeName);
  return type === typeName;
}

function buildRecipeSchema(page, cocktail) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    '@id': `${PUBLIC_ORIGIN}${page.route}#recipe-${slugify(cocktail.name)}`,
    name: cocktail.name,
    description: recipeDescription(page.lang, cocktail.name),
    recipeCategory: 'Cocktail',
    recipeIngredient: cocktail.ingredients,
    author: { '@id': `${PUBLIC_ORIGIN}/#organization` },
    image: absoluteUrl(cocktail.image),
    inLanguage: page.lang,
    mainEntityOfPage: { '@id': `${PUBLIC_ORIGIN}${page.route}#webpage` },
  };

  if (cocktail.instructions.length > 0) {
    schema.recipeInstructions = cocktail.instructions.map((text, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      text,
    }));
  }

  return schema;
}

function recipeDescription(lang, name) {
  const templates = {
    fr: (recipeName) => `${recipeName} : recette de cocktail présentée sur la page officielle Cognac Léopold Croizet.`,
    en: (recipeName) => `${recipeName}: cocktail recipe presented on the official Cognac Léopold Croizet page.`,
    ru: (recipeName) => `${recipeName}: рецепт коктейля, представленный на официальной странице Cognac Léopold Croizet.`,
    da: (recipeName) => `${recipeName}: cocktailopskrift vist på den officielle Cognac Léopold Croizet-side.`,
    sv: (recipeName) => `${recipeName}: cocktailrecept som visas på den officiella Cognac Léopold Croizet-sidan.`,
    no: (recipeName) => `${recipeName}: cocktailoppskrift vist på den offisielle Cognac Léopold Croizet-siden.`,
    'zh-Hans': (recipeName) => `${recipeName}：Cognac Léopold Croizet 官方页面展示的鸡尾酒配方。`,
  };

  return (templates[lang] || templates.en)(name);
}

function linesFromHtml(fragment) {
  return textFromHtml(fragment)
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function textFromHtml(fragment) {
  return decodeEntities(String(fragment || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n'))
    .replace(/\u00a0/g, ' ')
    .trim();
}

function decodeEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#([0-9]+);/g, (_match, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function absoluteUrl(value) {
  if (!value) return '';

  if (/^https?:\/\//i.test(value)) {
    return value.replace(`${PUBLIC_ORIGIN}/Cognac-Leopold-Croizet-site`, PUBLIC_ORIGIN);
  }

  const cleanPath = String(value).replace(/^\/Cognac-Leopold-Croizet-site\//, '/');
  return `${PUBLIC_ORIGIN}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;
}

function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
