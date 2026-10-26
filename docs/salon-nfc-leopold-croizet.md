# Page Se retrouver · NFC / QR · Cognac Léopold Croizet

## Adresses et sources

- Les anciens chemins `/salon/` et `/salon/desinscription/` redirigent en 301 vers les nouveaux chemins ; les fragments privés restent valides.
- Destination permanente NFC / QR : `https://cognac-leopold-croizet.com/se-retrouver/`.
- Retrait public, sans compte : `https://cognac-leopold-croizet.com/se-retrouver/desinscription/`.
- Sources : `scripts/page-templates/salon.html.in`, `salon-desinscription.html.in`, `assets/js/salon-contact.js`.
- Génération : `node scripts/build-salon-page.mjs`, également appelée par le build général.
- Pages autonomes et `noindex`, hors sitemap, sans géolocalisation, traceur, newsletter générique ni stockage navigateur.
- Charte : logo, photographie, Montserrat et Playfair Display officiels, blanc cassé et taupe. Marque insécable.
- Vue d’accueil sur un seul écran de téléphone : deux grandes cartes Instagram/Facebook occupent l’espace principal, formulaire compact en dessous, notice complète dans une fenêtre accessible depuis « Vos données ». À l’ouverture du clavier, en zoom ou pour afficher une confirmation/erreur, le défilement reste possible.
- Consentement commun « Je souhaite recevoir des invitations aux prochains salons et des offres de Cognac Léopold Croizet » avec un seul formulaire et un bouton « M’inscrire ». Le choix visible « Par SMS et/ou e-mail, selon les champs remplis » précise les canaux : téléphone seul, e-mail seul ou les deux. Le clic est requis ; le remplissage seul ne transmet aucune coordonnée. Les anciens consentements conservent leur version et leur texte historiques.
- Instagram et Facebook reprennent les liens officiels du site. Aucun prix ni nouvelle promotion chiffrée.

Les champs utilisent les attributs natifs `autocomplete="tel"` / `autocomplete="email"`, des labels explicites associés, les claviers adaptés et une taille de 16 px. Les deux champs sont regroupés dans le même formulaire, avec validation native (sans `novalidate` ni champ systématiquement obligatoire), touche Suivant sur le téléphone et Envoyer sur l’e-mail. Les valeurs sont lues au clic pour prendre en compte un remplissage Safari sans événement de saisie. Le piège à robots est inerte pour les interactions natives. Le téléphone peut proposer ses coordonnées enregistrées après interaction ; leur disponibilité dépend du navigateur et des réglages de l’utilisateur. Aucun accès au carnet d’adresses ni remplissage automatique forcé. Les numéros avec espaces insécables, préfixe 00 ou +33 (0) sont normalisés côté serveur.

Références : [CNIL, consentement par action positive](https://design.cnil.fr/concepts/consentement/), [Apple, remplissage des coordonnées](https://support.apple.com/fr-fr/guide/iphone/iphccfb450b7/ios), [Google, autofill](https://web.dev/learn/forms/autofill), [Apple, structure des formulaires AutoFill](https://developer.apple.com/documentation/safari-developer-tools/autofill).

Le propriétaire a signalé une absence de suggestion sur iPhone avec la version à deux formulaires. Le regroupement et la validation native suivent les recommandations Apple, mais une observation sur son appareil reste nécessaire pour confirmer la résolution du problème. Une émulation de dimensions mobiles ne prouve pas le fonctionnement de Safari AutoFill.

## Collecte réelle (version du 15 octobre 2026)

`api/salon-contact.php` accepte des requêtes JSON sur la même origine HTTPS. Les deux consentements indépendants sont validés côté serveur. Le consentement résulte du clic sur « M’inscrire » pour les canaux dont le champ est rempli ; aucune case supplémentaire n’est nécessaire. Si une coordonnée remplie est invalide, la demande entière est refusée et aucun des deux canaux n’est enregistré. La preuve chiffrée enregistre le type d’action et le texte du bouton. La confirmation de majorité a été retirée à la demande du propriétaire ; aucune majorité n’est déclarée automatiquement. Une coordonnée sans le consentement correspondant est ignorée, même si elle a été saisie. Un téléphone français doit avoir la structure d’un mobile ; les numéros internationaux doivent suivre le format E.164.

Chaque canal est dédupliqué séparément. Une inscription enregistre la date UTC, la marque, la source `se-retrouver`, la page, la version et le texte exact du consentement et la preuve de l’action positive. La version courante est `salon-contact-2026-10-15-v7`. Les soumissions concurrentes sont transactionnelles. La base newsletter commune conserve aussi les métadonnées techniques prévues par le formulaire historique (IP, navigateur, langue et référent sans requête ni fragment). La notice affichée le précise.

La propriété de l’adresse ou du téléphone est **déclarée, non vérifiée**. Aucun code SMS, double opt-in par e-mail ni service d’envoi commercial n’est branché. Le champ `ownership` de l’export le précise. La collecte utilise désormais le fichier commun `newsletter-data/subscriptions.csv`. Comme pour le formulaire newsletter, les nouvelles inscriptions sont regroupées pour envoyer le CSV complet au maximum une fois par heure au responsable de la maison (`leo.croizet@free.fr`), depuis `newsletter@cognac-leopold-croizet.com`. Aucun message commercial n’est envoyé au visiteur. Voir `api/README.md` pour les colonnes, la migration et la reprise des écritures.

## Stockage et accès

- SQLite et OpenSSL sont requis ; sinon le service refuse la collecte avec HTTP 503.
- Coordonnées et preuves chiffrées en AES-256-GCM, clés dérivées par usage, identifiants HMAC non réversibles.
- Sur l’arborescence OVH `www/site-pc-new/api/`, le dossier est `private-lc-salon` dans la racine du compte, **hors de `www`**. La configuration serveur peut définir `LC_SALON_PRIVATE_DIR`, obligatoirement hors de la racine publique.
- Dossier 0700, clé et base 0600, `umask 0077`, pas d’index public ni de téléchargement de base. Les liens symboliques de base/clé sont refusés. Une clé manquante sur une base existante bloque le service au lieu d’en créer une autre.
- `api/salon-config.php` contient uniquement l’empreinte d’un jeton administrateur. Ce fichier est hors Git, protégé par Apache et préservé à chaque déploiement. Le jeton est un secret GitHub `LC_SALON_ADMIN_TOKEN`, jamais transmis dans une URL.
- POST JSON limité à 8 Ko, contrôle strict d’origine, challenge signé à usage unique, piège à robots et quotas par empreinte IP temporaire. Aucun CORS ouvert.
- Les réponses privées portent `Cache-Control: no-store`, `Referrer-Policy: no-referrer` et `X-Robots-Tag`.
- La clé de chiffrement et la base sont propres à l’hébergement et ne passent pas dans le miroir SFTP. Pour une restauration, sauvegarder ces deux fichiers ensemble via l’accès privé de l’hébergeur ; ne jamais les placer dans le dépôt ou un dossier web.

### Consulter ou exporter les contacts

Le jeton local est conservé dans `~/.config/cognac-leopold-croizet/salon-admin.token`, permissions 0600. L’outil ne l’affiche pas et le transmet uniquement dans l’en-tête HTTPS Authorization :

```bash
python3 scripts/salon-admin.py
python3 scripts/salon-admin.py --export "$HOME/Documents/contacts-salon-$(date +%Y%m%d-%H%M%S).csv"
```

L’export refuse d’écrire dans le dépôt, crée un fichier privé 0600, contient uniquement les canaux actifs et inclut leurs dates, textes/version de consentement, statut déclaratif et liens individuels de retrait. Les formules de tableur sont neutralisées. Restreindre l’accès au CSV aux personnes habilitées ; conserver le jeton local privé. L’API sans authentification répond 401.

Avant chaque campagne, refaire l’export pour tenir compte des oppositions. Un export ancien ne se met pas à jour automatiquement. Les campagnes futures doivent identifier Cognac Léopold Croizet et proposer le retrait correspondant ; un fournisseur SMS devra aussi prendre en charge ses mécanismes d’opposition.

## Désinscription et conservation

Après l’inscription, un lien privé permet de gérer les canaux enregistrés sans saisir à nouveau ses coordonnées. Son jeton signé ne contient que des identifiants opaques et figure après `#`, hors requête URL et journaux d’accès. La page n’utilise aucun tiers ni traceur.

Sans lien, le formulaire public accepte une opposition par téléphone ou e-mail. Sa réponse ne révèle jamais si la coordonnée était inscrite. Les retraits sont réalisés exclusivement par POST : visiter un lien ne désinscrit personne. Chaque canal coché est retiré immédiatement ; l’autre reste actif. Le retrait efface la coordonnée chiffrée et la coordonnée dans le CSV commun ; il l’exclut des nouveaux exports. Les anciennes pièces jointes doivent être mises à jour avant usage. Une nouvelle inscription nécessite un nouveau consentement explicite.

Les coordonnées actives expirent trois ans après le dernier consentement explicite. Les preuves sont conservées trois ans ; une empreinte protégée d’opposition est conservée trois ans après retrait. Les données échues sont purgées à chaque accès, export et contrôle de santé. Le workflow `salon-retention.yml` appelle ce contrôle chaque heure et traite aussi les notifications regroupées devenues éligibles, y compris sans visite sur la page. Sa bonne exécution est visible dans GitHub Actions.

La notice publiée précise LA MAISON DES PIERRES (MPC), le contact `cognac@mdpierre.com`, les finalités, les canaux, la base du consentement, l’hébergement OVH, les durées et les droits.

Repères officiels : [CNIL, prospection électronique](https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique), [CNIL, communications électroniques](https://www.cnil.fr/fr/communication-electronique-quelles-regles), [CNIL, durées et activités commerciales](https://www.cnil.fr/fr/questions-reponses-sur-les-referentiels-relatifs-la-gestion-des-activites-commerciales-et-des). Les futurs contenus commerciaux restent à préparer selon leurs produits et destinataires.

## Contrôles et publication

- `PHP_BINARY=/opt/homebrew/opt/php@8.4/bin/php python3 scripts/test-salon-endpoint.py` : Contrôles locaux sur stockage temporaire, dont chiffrement, permissions, consentement séparé, données non consenties, absence de majorité fictive, formats, origine, rejeu, débit, concurrence, déduplication, accès privé, export, retrait séparé et expiration. Aucune communication envoyée.
- `npm run check` : pages statiques, newsletter existante, suivi et offres partenaires.
- `git diff --check`, syntaxe PHP et JavaScript, régénération identique des deux pages.
- Parcours local en navigateur : e-mail seul sans téléphone, lien privé reconnu puis retrait confirmé.
- Publication : push sur `main` → workflow `Deploy OVH` → tests → vérification HTTPS du WordPress historique → préparation du secret privé → SFTP → contrôle des pages, du marqueur de commit, du stockage et des refus 401/403.
- Après publication, lire le statut privé et le schéma commun sans exposer les coordonnées. Une inscription synthétique en production déclencherait l’envoi du CSV réel au responsable ; préférer les contrôles isolés de la CI pour les scénarios de collecte. Les résultats de déploiement sont consultables dans GitHub Actions.
- Utiliser exactement l’URL permanente ci-dessus sur NFC/QR. Les anciens SVG provisoires locaux encodent `/salon/`, qui redirige vers cette URL ; la destination doit être observée en production avant fabrication.

## Suivi par carte NFC

Les liens numérotés LC01 à LC10, la programmation NFC Tools, les compteurs, les colonnes d’origine et les exports sont décrits dans [nfc-card-tracking.md](nfc-card-tracking.md). Le lien sans numéro reste valable.
