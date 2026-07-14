# Mesure des conversions SEO/GEO

Date de mise en place : 14 juillet 2026.

## Objectif

Relier les visites organiques et les citations des moteurs de réponse aux actions commerciales observables sur le site Cognac Léopold Croizet, sans créer de profil visiteur.

## Événements

| Événement | Déclencheur | Propriétés conservées |
|---|---|---|
| contact_clicked | Ouverture de la page de rencontre, clic e-mail ou téléphone | langue, page, groupe de page, méthode, source catégorisée |
| newsletter_submitted | Réponse positive de api/newsletter.php | langue, page, groupe de page, source catégorisée |
| partner_order_clicked | Clic vers une fiche AV.ru validée | langue, page, produit, partenaire, source catégorisée |

## Limites volontaires

- Aucun identifiant visiteur ou utilisateur.
- Aucun cookie, localStorage ou sessionStorage.
- Aucune adresse e-mail, adresse IP ou information navigateur dans le fichier de conversion.
- Aucune URL référente complète ; uniquement une catégorie comme Google, Bing, Yandex, Baidu, ChatGPT, Perplexity, Copilot, direct ou autre.
- Aucun suivi de page vue généraliste.

## Exploitation

Le serveur stocke les événements dans conversion-data/conversions.csv. Ce dossier est privé et préservé pendant les publications OVH. Un rapport des nouvelles lignes est envoyé au maximum une fois par période de 24 heures à cognac@mdpierre.com lorsqu'une nouvelle conversion survient après l'échéance.

Les décisions mensuelles doivent se fonder sur les conversions par langue, page produit, source et type d'action, pas uniquement sur les impressions ou les clics des moteurs.
