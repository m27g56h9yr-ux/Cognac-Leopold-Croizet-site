# Audit de reconstruction - Cognac Léopold Croizet

## Synthèse

Le site a été reconstruit en version statique à partir des sitemaps publics de `cognac-leopold-croizet.com`, `en.cognac-leopold-croizet.com` et `ru.cognac-leopold-croizet.com`.

- 70 pages HTML statiques générées.
- 576 assets locaux conservés : images, SVG, polices, CSS, scripts utiles et vidéos.
- Les polices, couleurs, classes, structures, sliders, textes et visuels du site WordPress public sont conservés au plus près.
- Les dépendances externes visibles aux CDN de polices/icônes ont été localisées.
- Les balises SEO ont été régénérées : `title`, description, canonical, hreflang, Open Graph, Twitter card, JSON-LD, `sitemap.xml`, `robots.txt`, `site.webmanifest` et `llms.txt`.

## Architecture

La nouvelle version ne dépend plus de WordPress/PHP pour afficher les pages. Elle peut être servie par GitHub Pages, Netlify, Vercel, Cloudflare Pages ou un serveur web classique.

Le générateur est dans `scripts/build-static-site.mjs`. Il relit les sitemaps WordPress publics, récupère les pages, localise les ressources, enlève les scripts dynamiques inutiles et enrichit le SEO.

Le contrôleur est dans `scripts/check-static-site.mjs`. Il vérifie que les HTML/CSS générés ne pointent pas vers des ressources locales manquantes, des CDN externes critiques ou des routes WordPress dynamiques.

## Inventaire des pages

### Français

- `/`
- `/collection/`
- `/collection/excellence/`
- `/collection/extra/`
- `/collection/heritage/`
- `/collection/napoleon/`
- `/collection/valentine/`
- `/collection/vs/`
- `/collection/vsop/`
- `/collection/xo/`
- `/collection/xo-exception/`
- `/heritage/`
- `/la-matiere/`
- `/lalchimie/`
- `/le-feu/`
- `/le-temps/`
- `/leopold-croizet/`
- `/rencontre/`
- `/pierre-croizet-cocktails/`
- `/mentions-legales/`
- `/cgv/`
- `/commander/`
- `/panier/`
- `/mon-compte/`
- `/categorie-produit/non-classe/`

### Anglais

- `/en/`
- `/en/shop/`
- `/en/collection/excellence/`
- `/en/collection/extra/`
- `/en/collection/heritage/`
- `/en/collection/napoleon/`
- `/en/collection/valentine/`
- `/en/collection/vs/`
- `/en/collection/vsop/`
- `/en/collection/xo/`
- `/en/collection/xo-exception/`
- `/en/heritage/`
- `/en/la-matiere/`
- `/en/lalchimie/`
- `/en/le-feu/`
- `/en/le-temps/`
- `/en/leopold-croizet/`
- `/en/rencontre/`
- `/en/pierre-croizet-cocktails/`
- `/en/cart/`
- `/en/checkout/`
- `/en/my-account/`
- `/en/categorie-produit/non-classe-en/`

### Russe

- `/ru/`
- `/ru/a-faire/`
- `/ru/collection/excellence/`
- `/ru/collection/extra/`
- `/ru/collection/heritage/`
- `/ru/collection/napoleon/`
- `/ru/collection/valentine/`
- `/ru/collection/vs/`
- `/ru/collection/vsop/`
- `/ru/collection/xo/`
- `/ru/collection/xo-exception/`
- `/ru/heritage/`
- `/ru/la-matiere/`
- `/ru/lalchimie/`
- `/ru/le-feu/`
- `/ru/le-temps/`
- `/ru/rencontre/`
- `/ru/%d0%bb%d0%b5%d0%be%d0%bf%d0%be%d0%bb%d1%8c%d0%b4%d0%b0-%d0%ba%d1%80%d1%83%d0%b0%d0%b7%d0%b5/`
- `/ru/panier-2/`
- `/ru/validation/`
- `/ru/mon-compte-2/`
- `/ru/categorie-produit/non-classe-ru/`

## Réparations effectuées

Plusieurs chemins publics du WordPress d'origine renvoyaient une erreur ou pointaient vers une variante absente. Ils ont été réparés dans le générateur pour que la reconstruction reste reproductible.

- Favicons `cropped-favicon_512-*` remplacés par le blason SVG existant.
- `domaine-pierre-croizet.jpg` remplacé par l'image de propriété disponible.
- `Sparks12-1.mp4` remplacé par `Sparks12.mp4`.
- `distillation_compress.mp4` remplacé par `distillation_compress-1.mp4`.
- Plusieurs visuels mobiles russes remplacés par leurs variantes disponibles.
- La signature `signature_leopold_croizet*.png` est absente du serveur public. Elle a été remplacée par le logo de marque déjà présent dans le site.
- Les liens `lost-password` des comptes client ont été ramenés vers les pages compte, car le flux de récupération nécessite un backend.
- La fenêtre d'âge conserve son rendu et se ferme côté navigateur, sans appel WordPress.

## SEO et IA

La version statique inclut :

- URLs canoniques sur le domaine principal.
- Alternates `hreflang` issus du site multilingue.
- Métadonnées Open Graph et Twitter.
- JSON-LD `Organization` et `WebSite`.
- `sitemap.xml` généré avec les 70 pages.
- `robots.txt` ouvert à l'indexation.
- `llms.txt` pour fournir aux moteurs IA une carte claire des pages et du contexte de marque.

## Points d'attention

Les pages WooCommerce, compte, panier, commande, newsletter et formulaires sont conservées visuellement, mais une version statique ne peut pas traiter les paiements, connexions client, emails ou paniers sans backend. Pour réactiver ces fonctions, il faudra connecter une solution e-commerce/formulaire moderne ou garder un WordPress headless séparé.

Les vidéos sont conservées pour rester fidèle au rendu visuel. La plus lourde pèse environ 69 Mo ; les pages utilisent autant que possible les comportements existants de chargement différé, mais une optimisation vidéo dédiée peut encore améliorer les performances.

## Vérifications

- `node --check scripts/build-static-site.mjs`
- `node --check scripts/check-static-site.mjs`
- `node scripts/check-static-site.mjs`

