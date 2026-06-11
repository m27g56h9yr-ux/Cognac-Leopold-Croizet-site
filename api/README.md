# Newsletter OVH

Le formulaire newsletter envoie les adresses e-mail vers `api/newsletter.php`.

Sur OVH, le script crée et met à jour le fichier :

```text
newsletter-data/subscriptions.csv
```

Chaque ligne contient la date d'enregistrement, l'adresse e-mail, la langue de la page, l'URL de la page, la version du consentement, l'adresse IP, le navigateur, la page d'origine et la langue du navigateur.

Après chaque inscription valide, le script envoie le fichier CSV complet en pièce jointe à :

```text
cognac@mdpierre.com
```

La configuration par défaut est dans `newsletter-config.sample.php`. Pour modifier l'adresse d'envoi ou le chemin du CSV, copier ce fichier en `newsletter-config.php`.
