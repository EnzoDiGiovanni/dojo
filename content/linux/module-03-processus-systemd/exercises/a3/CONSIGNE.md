# Un service pour la météo

## Contexte

Hugo a écrit un petit service météo pour l'écran d'accueil de l'agence : `/opt/meteo/meteo.py`. Aujourd'hui, il le lance à la main dans un terminal, qu'il oublie de rouvrir après chaque redémarrage. Un compte système `meteo` a été créé pour lui.

Le programme lit sa configuration dans deux variables d'environnement : `PORT` et `VILLE` (voir `/opt/meteo/LISEZMOI`).

## Objectif

Écris l'unit `/etc/systemd/system/meteo.service` pour que :

- le service tourne avec le compte `meteo`, pas root ;
- il écoute sur le port **8090** et donne la météo de **Lyon** ;
- il démarre avec le serveur ;
- s'il plante ou est tué, systemd le relance.

## Contraintes

- Ne modifie pas `meteo.py`.
- Lance-le avec `/usr/bin/python3`.

## Critères de réussite

- `meteo` est actif, et activé au démarrage du serveur
- Le service tourne avec le compte `meteo`
- Sur le serveur, http://127.0.0.1:8090/ répond avec la ville « Lyon »
- Si le processus est tué brutalement, systemd le relance en moins de 5 secondes

## Comment tester

`curl http://127.0.0.1:8090/` sur le serveur. Pour le dernier critère : `sudo systemctl kill -s KILL meteo`, puis `systemctl status meteo`.
