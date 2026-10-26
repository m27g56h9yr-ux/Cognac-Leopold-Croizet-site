# Suivi des cartes NFC — Cognac Léopold Croizet

## Programmer les dix cartes

Une carte physique = un numéro distinct. Inscrire discrètement LC01 à LC10 au dos, puis utiliser le lien correspondant. Le numéro ne contient aucune donnée de client.

Dans NFC Tools : **Écrire → Ajouter un enregistrement → URL / URI**. Si le préfixe `https://` est déjà sélectionné, saisir uniquement la partie qui suit. Valider, puis **Écrire** et approcher le haut de l’iPhone d’une seule carte. Attendre la confirmation.

Pour la carte suivante, **modifier l’enregistrement URL existant** avec le numéro suivant. Il doit rester **un seul enregistrement URL**, pas dix liens sur chaque carte. Dans l’onglet Lire, contrôler le numéro enregistré, puis essayer l’ouverture du lien depuis l’écran d’accueil. Les essais d’ouverture font partie des compteurs. Conserver les cartes réinscriptibles pendant cette préparation.

| Carte | URL complète |
|---|---|
| LC01 | https://cognac-leopold-croizet.com/se-retrouver/?carte=LC01 |
| LC02 | https://cognac-leopold-croizet.com/se-retrouver/?carte=LC02 |
| LC03 | https://cognac-leopold-croizet.com/se-retrouver/?carte=LC03 |
| LC04 | https://cognac-leopold-croizet.com/se-retrouver/?carte=LC04 |
| LC05 | https://cognac-leopold-croizet.com/se-retrouver/?carte=LC05 |
| LC06 | https://cognac-leopold-croizet.com/se-retrouver/?carte=LC06 |
| LC07 | https://cognac-leopold-croizet.com/se-retrouver/?carte=LC07 |
| LC08 | https://cognac-leopold-croizet.com/se-retrouver/?carte=LC08 |
| LC09 | https://cognac-leopold-croizet.com/se-retrouver/?carte=LC09 |
| LC10 | https://cognac-leopold-croizet.com/se-retrouver/?carte=LC10 |

## Résultats disponibles

- **Ouvertures** : chargements visibles de la page portant ce numéro. Ni nombre de personnes uniques, ni preuve de lecture physique de la puce. Le même lien copié, partagé, programmé en QR ou rechargé compte aussi.
- **Clics Instagram / Facebook** : un clic par réseau et par chargement de page. Ce ne sont pas des abonnements sociaux confirmés.
- **Inscriptions validées** : soumissions acceptées par le serveur, y compris renouvellements. Téléphone + e-mail dans une seule soumission = une inscription, un accord SMS et un accord e-mail. Échec de validation ou simple saisie = zéro.
- **Coordonnées** : dans la liste commune, `card_id` indique la carte de la dernière inscription appliquée à la ligne ; `email_card_id` et `phone_card_id` indiquent la provenance du dernier accord du canal. Utiliser les colonnes par canal si les origines diffèrent. Un accès direct sans numéro laisse l’attribution correspondante vide. Les anciennes inscriptions ne sont pas attribuées rétroactivement.
- L’identifiant est public et modifiable : il décrit l’origine déclarée du lien, pas une preuve anti-fraude ni l’identité du porteur. Une carte peut servir à plusieurs visiteurs. Les identifiants LC01 à LC9999 sont pris en charge ; le rapport affiche les dix premières cartes même à zéro.

## Consulter le bilan

Le bilan CSV par carte est joint **au même e-mail que la liste d’inscrits**, après de nouvelles inscriptions, au maximum une fois par heure. Une ouverture ou un clic seul ne déclenche aucun e-mail. La maintenance horaire existante envoie les notifications devenues éligibles. Destinataire existant : leo.croizet@free.fr.

Fichier : `cognac-leopold-croizet-cartes-nfc-AAAAMMJJ-HHMMSS-utc.csv`. Colonnes : carte, URL, début/fin de période UTC, ouvertures, clics Instagram, clics Facebook, inscriptions validées, accords e-mail et accords SMS. Le bilan par défaut couvre les 25 derniers mois conservés ; les comptes ne sont pas remis à zéro lors d’un envoi.

L’accès administrateur existant permet aussi une consultation à la demande, même sans nouvelle inscription :

```sh
python3 scripts/salon-admin.py --cards
python3 scripts/salon-admin.py --cards --from-date 2026-10-26 --to-date 2026-10-26
python3 scripts/salon-admin.py --cards --export /tmp/bilan-cartes-nfc.csv
```

Le jeton existant reste dans son fichier privé local et est transmis exclusivement dans l’en-tête HTTPS. Aucun secret dans les liens des cartes. Les exports exigent un fichier nouveau, hors dépôt, permissions 0600. L’API privée est `api/salon-admin.php?report=cards`, avec `format=csv`, `from` et `to` optionnels.

## Fonctionnement technique et confidentialité

- Compteurs journaliers dans `nfc_daily`, dans la base SQLite privée existante hors racine web. Les compteurs ne contiennent ni IP, ni coordonnées, ni navigateur, ni profil visiteur. Conservation 25 mois, nettoyage automatique.
- Déduplication des événements par empreinte HMAC spécifique à l’événement d’un aléa de chargement, purgée au bout de 24 heures. Cet aléa ne passe pas dans les inscriptions et n’est pas conservé dans le navigateur. Aucun cookie, stockage local, SDK tiers ou identifiant inter-pages.
- Le point d’entrée POST `api/nfc-event.php` valide strictement l’origine, l’identifiant de carte, le type d’événement et la taille ; quota temporaire par empreinte IP pour limiter les abus. Les statistiques sont indicatives : JavaScript désactivé, blocage réseau ou falsification du lien peuvent modifier les chiffres.
- Les signaux DNT/GPC et `?mesure=non` désactivent les compteurs ; le lien d’opposition figure dans Vos données. L’origine de carte de l’inscription explicite reste enregistrée avec le consentement.
- Une défaillance des compteurs de navigation ne bloque ni les liens sociaux ni le formulaire. Les compteurs d’inscription et les preuves sont écrits dans la même transaction serveur. Les envois e-mail gardent le verrou et le délai de 3 600 secondes existants.
- Les liens sans `carte` et l’ancienne route `/salon/` continuent de fonctionner. Les liens privés de désinscription ne sont pas mesurés.
- Le nom d’un salon ou d’un emplacement n’est pas détecté automatiquement. Conserver un tableau d’affectation des cartes, et demander un bilan sur les dates concernées si une carte est réutilisée ailleurs.
