# Intégration de la boutique — 26 octobre 2026

Publication autorisée par Léopold le 26 octobre 2026 ; contrôler le déploiement et les neuf fiches publiques après le push.

## Périmètre et provenance

Demande : reprendre le module distributeur russe sous la bouteille, retirer
« Maison des Pierres » du pavé, conserver les liens et les formats existants.
Le pavé affiche le format ; la destination reste indiquée par
« Boutique en ligne · mdpierre.com ». Le texte de livraison existant est conservé.

Le script public `assets/js/conversion-tracking.js?v=20261024-order1`, lu le
26 octobre 2026, contenait un ajout JavaScript absent du checkout initial. Il figurait dans les
commits distants 6054b716 et f07a42ab, récupérés avant publication, avec les
correctifs de contrôle et de consentement newsletter jusqu’à acec8a4c. Son catalogue
est repris sans extension de produits, formats ou territoires :

| Fiche française | 70 cl | 35 cl |
| --- | --- | --- |
| VS | LC0001 | LC0002 |
| VSOP | LC0003 | LC0004 |
| Napoléon | LC0007 | — |
| XO | LC0009 | — |
| XO Exception | LC0011 | — |
| Extra | LC0012 | — |
| Excellence | LC0013 | — |
| Héritage | LC0014 | — |
| Valentine XO | — | LC0015 |

Destination inchangée : `https://boutique.mdpierre.com/commander/?mdp_ref=…&mdp_lang=fr`.
Les formats supplémentaires restent visibles dans les sélecteurs existants,
mais sans lien de commande s’ils ne figurent pas dans cette table. Aucun prix
ni stock n’est ajouté. Aucun achat, panier, devis ou paiement de test n’a été créé.

## Implémentation

- `scripts/direct-order-links.mjs` rend le bloc HTML et ses liens statiques.
- `scripts/seo-hardening.mjs` l’intègre après le nettoyage des anciennes commandes.
- `assets/direct-order.css` conserve le bronze et le blanc du dispositif existant.
  L’ordre de la galerie reste stable après l’initialisation de FlexSlider :
  photo, médailles éventuelles, commande, miniatures.
- `assets/js/direct-order.js` synchronise le lien avec les deux sélecteurs de format.
- Le même identifiant `mdp-direct-order` fait quitter l’ancien ajout JavaScript
  conservé dans le dépôt après récupération des commits distants, afin d’éviter
  un doublon lors du déploiement HTML.
- Le parcours reste limité aux neuf fiches françaises. Les liens AV.ru,
  les autres langues et les pineaux restent inchangés.
- Le garde existant `lc-hide-prices` masque aussi le bloc de commande.
- La destination commerciale est la France métropolitaine, indiquée dans le
  texte visible. Le site utilise des routes linguistiques : ce dispositif ne
  géolocalise pas l’adresse IP du lecteur et ne crée aucune nouvelle redirection.

## SEO et GEO

Liens présents dès le HTML initial, nom accessible avec produit, contenance et
destination. Canoniques, hreflang, sélecteurs et identifiants produit conservés.
Dates de modification actualisées ; le générateur rétablit aussi la bonne image
XO Exception dans les métadonnées (l’ancienne sortie désignait une image VS).
Pas de nouvelle `Offer`, de prix, de stock ou d’avis inventé dans le JSON-LD.
La synchronisation AV.ru (API, cache, client et données structurées) est conservée
à l’identique. Aucun flux équivalent MDP n’a été trouvé dans le code actuel ni
dans la page publique de commande. Léopold a choisi explicitement de publier la
présentation en conservant les balises actuelles, sans ajouter ce flux à ce stade.

Les anciennes indications françaises imposant exclusivement un contact direct
ont été clarifiées dans les pages de commande et les informations légales :
le site vitrine n’encaisse pas, les fiches concernées ouvrent la boutique externe.
Les conditions contractuelles de la boutique elle-même ne sont pas modifiées.
Les deux guides `llms` décrivent cette répartition, sans promesse de visibilité.

Références techniques :
- https://developers.google.com/search/docs/crawling-indexing/links-crawlable
- https://developers.google.com/search/docs/appearance/ai-features

## Vérifications

- Génération SEO complète : 302 pages traitées. Les changements automatiques
  sans rapport avec la demande ont été retirés du diff final ; le diff complet
  est conservé localement dans `tmp/direct-order-full-regeneration.patch`.
- `npm run check` : 301 fichiers HTML/CSS, newsletter (7 langues), suivi des
  conversions (259 pages), offres AV.ru (11 offres sur 8 pages), commandes MDP.
- Contrôle MDP : 9 pages, 11 destinations exactes, deux sélecteurs, formats
  non commercialisés, 56 pages exclues, absence de doublon après régénération.
- Comparaison au dépôt initial : canoniques, hreflang et sélecteurs de format
  identiques sur les neuf pages. Données JSON-LD produit conservées sauf la
  correction de l’image XO Exception et les dates de modification.
- Navigateur : VSOP 70/35 cl, XO 35 cl sans lien ; affichages desktop,
  390 px (VSOP) et 320 px (XO Exception avec médailles).
- `git diff --check` et syntaxe JavaScript valides.

Prépublication : accord réseau et publication reçu ; rebase sur les quatre
commits distants effectué ; API WordPress historique accessible en HTTPS avec
`wp/v2`, ses routes et l’URL `https://ancien.cognac-leopold-croizet.com`.
La CI conserve le même contrôle bloquant avant SFTP. Les six arborescences
internationales et toute la synchronisation AV.ru sont identiques à origin/main.
Après push, vérifier le workflow, `deploy-version.txt`, les neuf pages sur écran
large/étroit et les onze liens, sans créer de commande ni de paiement.

## Simplification demandée après publication

Le 26 octobre 2026, Léopold a demandé de retirer les deux lignes sous le bouton :
« Boutique en ligne · mdpierre.com » et la phrase de livraison/retrait.
Seuls le format et « Commander » restent visibles dans le bloc. Le renvoi
ARIA vers la note supprimée est retiré ; les URL, les balises JSON-LD et les
circuits internationaux restent identiques. Cette suppression de texte
n’étend pas les destinations de livraison autorisées par la boutique.
