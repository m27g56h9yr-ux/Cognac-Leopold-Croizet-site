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

## Déploiement OVH

Le déploiement automatique est configuré dans GitHub Actions avec le fichier `.github/workflows/deploy-ovh.yml`.

Les secrets sont dans GitHub, dans le dépôt, menu **Settings** > **Secrets and variables** > **Actions**. Les secrets utilisés sont :

- `OVH_SFTP_HOST`
- `OVH_SFTP_USERNAME`
- `OVH_SFTP_PASSWORD`
- `OVH_SFTP_TARGET_DIR`

Pour lancer un déploiement manuel : ouvrir l'onglet **Actions** du dépôt GitHub, choisir **Deploy OVH**, cliquer sur **Run workflow**, sélectionner la branche `main`, puis confirmer.

Le dossier distant doit rester `.` dans le secret `OVH_SFTP_TARGET_DIR`, car l'utilisateur SFTP OVH `cognacg-codex` arrive déjà directement dans `www/site-pc-new`. Il ne faut donc pas viser `www`, `www/site-pc` ou `www/site-pc-new` dans le workflow.

Avant de déployer, GitHub Actions exécute `npm run build`, puis `npm run check`. Si une étape échoue, le déploiement s'arrête.

Après le déploiement, GitHub Actions vérifie automatiquement ces pages :

- `https://cognac-leopold-croizet.com/`
- `https://cognac-leopold-croizet.com/rencontre/`
- `https://cognac-leopold-croizet.com/mentions-legales/`

Pour vérifier manuellement que la production est à jour, ouvrir ces pages dans un navigateur et contrôler que les derniers changements visibles apparaissent bien. On peut aussi regarder le dernier run GitHub Actions : il doit être vert, avec l'étape finale de vérification en succès.
