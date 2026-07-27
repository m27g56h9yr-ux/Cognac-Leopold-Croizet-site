# Newsletter OVH

Le formulaire newsletter envoie les adresses e-mail vers `api/newsletter.php`.

Sur OVH, le script crée et met à jour le fichier :

```text
newsletter-data/subscriptions.csv
```

Chaque ligne contient la date d'enregistrement, l'adresse e-mail, la langue de la page, l'URL de la page, la version du consentement, l'adresse IP, le navigateur, la page d'origine et la langue du navigateur.

Le parcours reste limité à un champ e-mail et un clic. Un champ piège hors écran et un horodatage technique fournissent seulement des signaux d'observation : ils ne provoquent aucun rejet, aucun CAPTCHA et aucune étape supplémentaire. Les décisions sont journalisées sans adresse e-mail ni adresse IP dans :

```text
newsletter-data/submission-risk.csv
```

Une adresse déjà présente, après suppression des espaces en début et fin et passage en minuscules, reçoit la même réponse de succès sans créer de deuxième ligne ni envoyer un deuxième courriel. Les points et suffixes propres à certains fournisseurs de messagerie ne sont pas modifiés.

Après chaque inscription valide, le script envoie le fichier CSV complet en pièce jointe avec les adresses suivantes :

```text
Expéditeur : newsletter@cognac-leopold-croizet.com
Destinataire : leo.croizet@free.fr
```

La configuration par défaut est dans `newsletter-config.sample.php`. Pour modifier le destinataire, l'expéditeur ou les chemins des fichiers CSV, copier ce fichier en `newsletter-config.php`.

Si `api/newsletter-config.php` existe déjà sur OVH, ses valeurs priment sur la configuration par défaut et ce fichier est conservé pendant les déploiements. Sa valeur `notification_to` doit donc également être `leo.croizet@free.fr`.

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
