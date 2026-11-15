# Planifier avec cron

## Contexte

Deux tâches doivent être automatisées sur le serveur de La Fabrique :

- `/usr/local/bin/purge-cache` vide le cache de la vitrine. Elle doit tourner **toutes les 15 minutes**, avec le compte **`www-data`** (celui du serveur web). Tout ce qu'elle affiche, **erreurs comprises**, doit s'ajouter à `/var/log/vitrine/purge.log`.
- `/usr/local/bin/rapport-hebdo` envoie le rapport de lea. Elle doit tourner **chaque lundi à 7 h 30**, dans **la crontab de `lea`**.

## Objectif

1. Écris `/etc/cron.d/vitrine` pour la purge.
2. Ajoute la tâche du rapport à la crontab de `lea`.

## Contraintes

- Ne modifie pas les deux scripts.
- Pas de `chmod 777` sur `/var/log/vitrine`.

## Critères de réussite

- cron accepte le fichier `/etc/cron.d/vitrine`, qui lance la purge toutes les 15 minutes avec le compte `www-data`
- Lancée exactement comme cron le ferait, la purge ajoute sa sortie et ses erreurs à `/var/log/vitrine/purge.log`
- La crontab de `lea` lance `rapport-hebdo` chaque lundi à 7 h 30

## Comment tester

N'attends pas 15 minutes : lance la commande de ta ligne comme cron le ferait (voir le cours), puis lis `/var/log/vitrine/purge.log`. La vérification fait de même.
