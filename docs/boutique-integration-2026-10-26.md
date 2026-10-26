# Intégration de la boutique — 26 octobre 2026

Version préparée localement, sans publication dans le cadre de cette vérification.

## Périmètre et provenance

Demande : reprendre le module distributeur russe sous la bouteille, retirer
« Maison des Pierres » du pavé, conserver les liens et les formats existants.
Le pavé affiche le format ; la destination reste indiquée par
« Boutique en ligne · mdpierre.com ». Le texte de livraison existant est conservé.

Le script public `assets/js/conversion-tracking.js?v=20261024-order1`, lu le
26 octobre 2026, contenait un ajout JavaScript absent du dépôt. Son catalogue
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
  encore présent sur le serveur, afin d’éviter un doublon lors du déploiement HTML.
- Le parcours reste limité aux neuf fiches françaises. Les liens AV.ru,
  les autres langues et les pineaux restent inchangés.
- Le garde existant `lc-hide-prices` masque aussi le bloc de commande.

## SEO et GEO

Liens présents dès le HTML initial, nom accessible avec produit, contenance et
destination. Canoniques, hreflang, sélecteurs et identifiants produit conservés.
Dates de modification actualisées ; le générateur rétablit aussi la bonne image
XO Exception dans les métadonnées (l’ancienne sortie désignait une image VS).
Pas de nouvelle `Offer`, de prix, de stock ou d’avis inventé dans le JSON-LD.

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

Avant publication : obtenir l’accord réseau/publication applicable au dépôt,
vérifier le prérequis OVH de préservation de l’ancien WordPress, puis contrôler
la version déployée et les neuf fiches publiques. Ne pas conclure à une
publication sur la seule base des contrôles locaux.
