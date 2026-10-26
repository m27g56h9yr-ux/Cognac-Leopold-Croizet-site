# Newsletter OVH

Le formulaire newsletter envoie les adresses e-mail vers `api/newsletter.php`. La page `/se-retrouver/` utilise `api/salon-contact.php` pour le téléphone, l’e-mail ou les deux. Les deux parcours alimentent le même fichier ci-dessous, via `api/newsletter-lib.php`.

Sur OVH, le script crée et met à jour le fichier :

```text
newsletter-data/subscriptions.csv
```

Chaque ligne conserve les neuf colonnes historiques : date, e-mail, langue, page d’origine, version du consentement, IP, navigateur, référent et langue du navigateur. Les nouvelles colonnes ajoutent `phone`, `consent_email`, `consent_sms`, `email_page`, `phone_page`, `last_page`, `updated_at` et les dates, textes et versions de consentement de chaque canal. `page` garde la première origine ; les colonnes par canal indiquent la page de leur dernier consentement enregistré. Les nouveaux chemins ne contiennent ni requête ni fragment. Aucun consentement SMS n’est déduit d’une ancienne inscription e-mail. Un envoi avec les deux coordonnées les regroupe lorsque cela n’écrase pas une coordonnée différente déjà enregistrée.

Le parcours reste limité à un champ e-mail et un clic. Un champ piège hors écran et un horodatage technique fournissent seulement des signaux d'observation : ils ne provoquent aucun rejet, aucun CAPTCHA et aucune étape supplémentaire. Les décisions sont journalisées sans adresse e-mail ni adresse IP dans :

```text
newsletter-data/submission-risk.csv
```

Une adresse déjà présente, après suppression des espaces en début et fin et passage en minuscules, reçoit la même réponse de succès sans créer de deuxième ligne ni envoyer un deuxième courriel. Les points et suffixes propres à certains fournisseurs de messagerie ne sont pas modifiés.

Les inscriptions sont enregistrées immédiatement. Le fichier CSV complet est envoyé au maximum une fois par heure, uniquement lorsqu’il y a de nouvelles inscriptions, avec les adresses suivantes :

```text
Expéditeur : newsletter@cognac-leopold-croizet.com
Destinataire : leo.croizet@free.fr
```

La pièce jointe porte un nom propre au site, compatible avec les traitements automatisés :

```text
cognac-leopold-croizet-newsletter-inscriptions-AAAAMMJJ-HHMMSS-utc.csv
```

Ce nom permet d'identifier immédiatement Cognac Léopold Croizet et l'instant d'envoi sans modifier le stockage serveur, qui reste `newsletter-data/subscriptions.csv`.

La configuration effective est chargée par `newsletter-lib.php` ; `newsletter-config.sample.php` en fournit le modèle. Pour modifier le destinataire, l'expéditeur ou les chemins des fichiers CSV, copier ce fichier en `newsletter-config.php`.

Si `api/newsletter-config.php` existe déjà sur OVH, ses valeurs priment sur la configuration par défaut et ce fichier est conservé pendant les déploiements. Sa valeur `notification_to` doit donc également être `leo.croizet@free.fr`.


## Regroupement des notifications

Une limite commune aux deux formulaires impose au moins 3 600 secondes entre les tentatives d’envoi et après le dernier envoi réussi. Le créneau est réservé en base avant l’appel au transport, sous verrou, pour éviter les doublons en cas de requêtes simultanées. Un verrou d’envoi distinct ne bloque pas les écritures dans le CSV pendant l’envoi.

Les changements à notifier sont conservés durablement par un compteur de révision. Les inscriptions suivantes sont regroupées ; chaque envoi lit la liste courante. Aucun message n’est envoyé sans nouvelle inscription. En cas d’échec, les mises à jour restent en attente pour une tentative ultérieure, également soumise au délai d’une heure. La confirmation d’inscription ne dépend pas de l’envoi immédiat de cette notification interne.

Le workflow existant `salon-retention.yml` passe chaque heure et appelle le contrôle de santé, qui traite les notifications devenues éligibles, même sans nouvelle visite. Les requêtes habituelles peuvent aussi déclencher cet envoi. Il s’agit d’un plafond d’envoi, pas d’une garantie de réception à heure fixe : le passage suivant du contrôle horaire et les délais du planificateur peuvent retarder l’e-mail. Lors du premier déploiement de cette limite, un délai conservateur d’une heure protège contre la répétition d’un éventuel envoi de l’ancienne version, qui ne conservait pas son horodatage.

Le statut privé expose `notification_min_interval_seconds`, `notification_pending`, `notification_last_sent_at` et `notification_next_eligible_at`, sans coordonnées de contacts.

## Écriture commune et désinscription

Les anciens fichiers à neuf colonnes sont relus par nom de colonne ; les colonnes supplémentaires éventuelles sont conservées. La migration refuse un fichier mal formé avant toute écriture. Un verrou stable `.lock` et un remplacement atomique par fichier temporaire 0600 protègent les mises à jour concurrentes. `record_version=2` signale l’échappement réversible des cellules pouvant être interprétées comme formules de tableur.

Les nouveaux consentements et les opérations en attente sont chiffrés dans la base privée SQLite. Une inscription ou un retrait n’est confirmé qu’après application au CSV commun. En cas de panne entre les deux écritures, l’opération reste en attente et sera rejouée sans perdre les autres lignes au prochain accès ou contrôle de santé quotidien. Le raccordement initial reprend les consentements actifs historiques de la page sans notification en masse. Les oppositions connues sont appliquées à la base commune.

`/se-retrouver/desinscription/` retire uniquement le canal demandé, y compris un e-mail inscrit par l’ancien formulaire. L’autre coordonnée reste active. L’expiration des nouveaux consentements est répercutée dans le CSV. Les copies de CSV déjà envoyées par e-mail ne se modifient pas rétroactivement : toujours utiliser la liste serveur actuelle et répercuter les retraits avant une campagne. Ne pas réimporter une ancienne pièce jointe comme liste active.

`python3 scripts/salon-admin.py` affiche les compteurs, le schéma du CSV, les pages d’origine et la conformité des adresses de notification sans afficher les coordonnées. Son export historique reste un export des preuves chiffrées ; les anciens inscrits présents seulement dans le CSV restent dans la liste commune.

### Cartes NFC

Les liens `/se-retrouver/?carte=LC01` à `?carte=LC10` permettent d’attribuer les ouvertures, clics sociaux et inscriptions à une carte. Les colonnes `card_id`, `email_card_id` et `phone_card_id` sont ajoutées au CSV commun lors de sa prochaine écriture, en préservant les lignes existantes. Les colonnes par canal indiquent la carte du dernier accord de ce canal ; `card_id` correspond à la dernière inscription appliquée à la ligne. Les anciens contacts ne reçoivent aucune attribution inventée.

`python3 scripts/salon-admin.py --cards` consulte le bilan privé. `--from-date`, `--to-date` et `--export` permettent de choisir une période UTC et un CSV. Ce bilan accompagne les notifications d’inscription existantes dans un second fichier `cognac-leopold-croizet-cartes-nfc-AAAAMMJJ-HHMMSS-utc.csv`, avec la même limite globale d’un envoi par heure. Les ouvertures/clics seuls ne déclenchent pas d’e-mail.

Les compteurs journaliers sont conservés 25 mois dans la base privée, les empreintes de déduplication 24 heures. Aucun cookie ni profil visiteur ; les liens sans numéro fonctionnent sans comptage par carte. Le point d’entrée de mesure `api/nfc-event.php` n’expose pas les statistiques et n’envoie aucun e-mail. Voir [le guide complet des dix cartes](../docs/nfc-card-tracking.md).

## Mesure des conversions SEO/GEO

Le script `conversion.php` enregistre uniquement trois familles d'actions :

- ouverture de la page de rencontre, clic e-mail ou clic téléphone ;
- inscription newsletter confirmée par le serveur ;
- clic vers une fiche partenaire AV.ru.

Les données sont enregistrées dans `conversion-data/conversions.csv`. Elles sont limitées à la date, au type d'action, à la langue, au chemin interne, au groupe de page, au produit éventuel et à une catégorie de source de trafic.

Le fichier ne contient ni adresse e-mail, ni adresse IP, ni navigateur, ni URL référente complète, ni identifiant visiteur. Aucun cookie, localStorage ou sessionStorage n'est utilisé.

Un rapport contenant seulement les nouvelles lignes est envoyé au maximum une fois par période de 24 heures à `cognac@mdpierre.com`, lors de la première conversion qui suit l'échéance. La configuration peut être adaptée en copiant `conversion-config.sample.php` vers `conversion-config.php`.

Le dossier `conversion-data/` et le fichier local `api/conversion-config.php` sont exclus des publications destructives afin de préserver les mesures déjà enregistrées.

## Prix partenaires AV.ru

Les pages produit russes chargent `/api/partner-offers.php?slug=...` à chaque visite. L’endpoint répond immédiatement depuis `partner-data/avru-offers.json`, puis tente en arrière-plan une actualisation de l’API produit AV.ru lorsque le relevé dépasse 15 minutes.

Le cache n’est jamais public directement et il est conservé pendant les déploiements. `api/partner-offers-seed.json` fournit uniquement le relevé initial vérifié. Un prix n’est affiché et injecté dans `Product.offers` que pendant sept jours maximum, avec le vendeur AV.ru, la ville de Moscou, le format et la disponibilité correspondants. En cas d’échec, le bouton AV.ru reste visible sans prix trompeur.

Pour les pages russes VS et VSOP, chaque modèle 35 cl, 70 cl ou coffret pointe vers sa propre fiche AV.ru et charge son propre prix. Le XO n’affiche actuellement une offre que pour le modèle 35 cl, seul format dont la fiche vendeur exacte est vérifiée. Lorsqu’aucune fiche exacte n’est connue pour le modèle choisi, le contrôle de commande est masqué au lieu de reprendre le prix d’un autre format.
