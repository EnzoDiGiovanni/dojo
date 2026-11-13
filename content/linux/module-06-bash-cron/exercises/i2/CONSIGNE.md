# Des comptes à la chaîne

## Contexte

Les RH de La Fabrique envoient chaque mois un fichier des arrivées, comme `/srv/rh/arrivees-novembre.csv` : une ligne d'en-tête, des commentaires (`#`), parfois des lignes vides, puis une ligne par personne au format `login;nom complet;groupes`, les groupes séparés par des virgules. Les fichiers sont saisis à la main : il y a parfois des erreurs.

## Objectif

Écris `/usr/local/sbin/creer-comptes`, lancé par root avec `creer-comptes <fichier>`, qui pour chaque ligne :

- ignore l'en-tête, les commentaires et les lignes vides ;
- refuse une ligne invalide (moins de trois champs, ou login qui ne commence pas par une lettre minuscule ou qui contient autre chose que des minuscules, chiffres et tirets) : il la **signale sur la sortie d'erreur avec son numéro de ligne** et passe à la suivante ;
- crée le compte s'il n'existe pas, avec son nom complet, un dossier personnel et le shell `/bin/bash` ;
- l'ajoute à ses groupes, en créant ceux qui n'existent pas encore, sans le retirer de ceux qu'il avait déjà.

Il sort avec le code **1** si au moins une ligne a été refusée, **0** sinon. Relancé sur le même fichier, il ne recrée rien et ne signale rien pour les comptes déjà là.

## Critères de réussite

- Les comptes valides du fichier sont créés avec leur nom complet, un dossier personnel et tous leurs groupes, même inexistants jusque-là
- Chaque ligne invalide est signalée sur la sortie d'erreur avec son numéro, sans bloquer les autres, et le script sort avec le code 1
- Relancé sur un fichier sans erreur, le script ne recrée rien, ajoute les groupes manquants, n'écrit rien sur la sortie d'erreur et sort avec le code 0

## Comment tester

`sudo creer-comptes /srv/rh/arrivees-novembre.csv ; echo $?`, puis une seconde fois. La vérification fabrique ses propres fichiers, avec de nouveaux logins à chaque fois, et supprime ensuite les comptes qu'elle a fait créer.
