# Des journaux qui ne remplissent plus le disque

## Contexte

L'application de la vitrine (`vitrine-app.service`) écrit deux journaux dans `/var/log/vitrine/` : `app.log` et `acces.log`. Personne ne les fait tourner : ils grossissent depuis des mois. Lis `/opt/vitrine/LISEZMOI`.

## Objectif

Écris `/etc/logrotate.d/vitrine` pour que tous les journaux `*.log` de `/var/log/vitrine` :

- tournent **chaque jour** ;
- soient conservés **14 jours** ;
- soient **compressés** ;

et que l'application continue d'écrire dans des fichiers neufs après chaque rotation, sans être redémarrée.

## Contraintes

- Ne modifie pas l'application ni son unit.
- Pas de `copytruncate` : l'application sait rouvrir ses fichiers, sers-t'en.

## Critères de réussite

- La règle `/etc/logrotate.d/vitrine` est valide et s'applique à tous les journaux de `/var/log/vitrine`
- Les journaux tournent chaque jour, 14 anciens journaux sont gardés, compressés
- Après une rotation, l'application écrit dans des fichiers neufs, et les anciens ne grossissent plus

## Comment tester

`sudo logrotate -d /etc/logrotate.d/vitrine` simule, `sudo logrotate -f /etc/logrotate.d/vitrine` force une rotation. `ls -l /var/log/vitrine` à quelques secondes d'intervalle.
