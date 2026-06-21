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

## Déploiement

`npm run build` génère la version OVH / domaine racine, sans préfixe `/Cognac-Leopold-Croizet-site`.
`npm run build:github-pages` conserve ce préfixe pour une publication GitHub Pages en sous-dossier.

Les mêmes scripts acceptent aussi `DEPLOY_BASE_PATH=/chemin npm run build` pour une base personnalisée.

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

Avant de déployer, GitHub Actions vérifie que les fichiers statiques essentiels sont présents, puis exécute `npm run check`. Si une étape échoue, le déploiement s'arrête.

Le workflow OVH ne lance pas `npm run build`, car ce script reconstruit le site depuis les URLs publiques WordPress. Le déploiement OVH doit publier l'état déjà commité dans GitHub, afin de ne pas dépendre de l'ancien site, d'un sitemap WordPress absent, ou d'un cache de production.

Après le déploiement, GitHub Actions vérifie automatiquement ces pages :

- `https://cognac-leopold-croizet.com/`
- `https://cognac-leopold-croizet.com/rencontre/`
- `https://cognac-leopold-croizet.com/mentions-legales/`

Le workflow publie aussi `deploy-version.txt` sur le site. Ce fichier contient le commit GitHub deploye. L'etape finale verifie que ce fichier est visible en production, puis controle que :

- la home ne contient plus les anciennes references `cognac-pierre-croizet.com`, `en.cognac-leopold-croizet.com`, `ru.cognac-leopold-croizet.com` ou `cognacg.cluster028.hosting.ovh.net` ;
- `/rencontre/` contient `30 Rue d'Angouleme` et ne contient plus `30 Route d'Angouleme` ;
- `/mentions-legales/` ne contient plus `www.leopold-croizet.com`.

Si le workflow est vert, le bon commit est vraiment visible sur `https://cognac-leopold-croizet.com`. Si le workflow echoue uniquement a l'etape finale, le deploiement SFTP a probablement fonctionne mais OVH sert encore un cache, ou le domaine pointe vers un autre dossier que celui deploye.

Pour verifier manuellement que la production est a jour, ouvrir `https://cognac-leopold-croizet.com/deploy-version.txt` et comparer le commit affiche avec le dernier commit GitHub.
