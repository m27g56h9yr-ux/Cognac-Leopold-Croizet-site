# Cognac Leopold Croizet

Reconstruction statique du site `cognac-leopold-croizet.com`.

Objectif :

- conserver le rendu visuel du site existant : polices, couleurs, images, structure et pages ;
- supprimer la dépendance visible à WordPress/PHP pour accélérer le chargement ;
- améliorer l'indexation avec pages statiques, `sitemap.xml`, `robots.txt`, balises canoniques, hreflang, Open Graph, JSON-LD et `llms.txt`.

## Structure

- `index.html`, pages `/collection/...`, `/en/...`, `/ru/...` : pages statiques générées depuis le site public.
- `wp-content/`, `wp-includes/`, `assets/` : images, polices, CSS et scripts localisés.
- `scripts/build-static-site.mjs` : régénère la copie statique depuis les sitemaps WordPress publics.
- `AUDIT.md` : analyse page par page et recommandations.

## Règles de marque

- Le mot `Croizet` ne doit jamais apparaître seul dans un texte visible, un titre, une description, une alternative d'image ou une donnée SEO.
- La marque doit être écrite `Léopold Croizet`.
- `Léopold` et `Croizet` doivent rester sur la même ligne, dans la même police, la même taille et le même style. Ne jamais séparer les deux mots dans deux balises, deux lignes, deux tailles ou deux traitements graphiques différents.
- Pour les nouveaux blocs graphiques, utiliser un espace insécable ou un élément unique lorsque le contexte risque de couper le nom sur deux lignes.

## Regeneration

```bash
node scripts/build-static-site.mjs
```

Le script ne nécessite aucune dépendance npm.

## Controle

```bash
node scripts/check-static-site.mjs
```

`npm run check` fonctionne aussi dans un environnement ou `npm` est disponible.

La version statique conserve le rendu des pages WooCommerce, compte, panier et commande, mais ces parcours nécessitent un backend pour traiter réellement les achats, connexions et emails.
