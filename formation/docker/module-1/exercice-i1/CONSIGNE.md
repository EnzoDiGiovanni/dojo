# Configurer un service

## Contexte

L'image `traefik/whoami:v1.10` est un petit serveur HTTP qui renvoie des informations sur la requête qu'il reçoit. Sa documentation (page Docker Hub ou dépôt GitHub `traefik/whoami`) décrit les variables d'environnement qu'il comprend.

## Objectif

Lance un conteneur `dojo-m1-i1` depuis `traefik/whoami:v1.10` qui respecte toutes ces exigences :

- il répond sur http://127.0.0.1:47102 ;
- la page renvoyée commence par `Name: dojo` ;
- **à l'intérieur du conteneur**, le serveur écoute sur le port **9000** (et plus sur son port par défaut) ;
- il n'est joignable que depuis ta machine, pas depuis le réseau local ;
- s'il plante, ou si le daemon Docker redémarre, il redémarre tout seul — sauf si c'est toi qui l'as arrêté.

## Contraintes

- Une seule commande `docker run`.
- Trouve toi-même dans la documentation de l'image comment configurer le nom et le port.

## Critères de réussite

- `dojo-m1-i1` tourne depuis l'image `traefik/whoami:v1.10`
- http://127.0.0.1:47102 répond et la page contient `Name: dojo`
- Le serveur écoute sur le port 9000 à l'intérieur du conteneur
- Le port n'est publié que sur l'interface locale 127.0.0.1
- La politique de redémarrage correspond au besoin exprimé

## Comment tester

`curl http://127.0.0.1:47102`, `docker port dojo-m1-i1`, puis « Vérifier mon travail ».
