# Validation — un service d'écho

## Contexte

`hashicorp/http-echo:1.0` est un serveur HTTP minimal qui renvoie un texte fixe. Il se configure **par arguments de ligne de commande** : découvre lesquels en lançant l'image avec l'argument `-help`.

Pas d'indice ici : c'est toi seul. Une fois les critères remplis, tu devras justifier tes choix.

## Objectif

1. Lance un conteneur `dojo-m1-v1` depuis `hashicorp/http-echo:1.0` :
   - http://127.0.0.1:47120 renvoie exactement le texte `dojo-validation` ;
   - à l'intérieur du conteneur, le serveur écoute sur le port **5000** ;
   - le service n'est joignable que depuis ta machine ;
   - s'il plante, il redémarre automatiquement, au plus 3 fois ; s'il se termine normalement, il reste arrêté.
2. Crée un fichier `infos.env` dans ce dossier avec :
   - `CONTAINER_IP` : l'adresse IP de `dojo-m1-v1` ;
   - `IMAGE_ID` : l'identifiant court (12 premiers caractères hexadécimaux, sans le préfixe `sha256:`) de l'image utilisée par le conteneur.
3. Quand tu as fini, aucun conteneur arrêté issu de `hashicorp/http-echo:1.0` ne doit traîner (par exemple celui de ton `-help`).

## Critères de réussite

- `dojo-m1-v1` tourne depuis l'image `hashicorp/http-echo:1.0`
- http://127.0.0.1:47120 renvoie exactement `dojo-validation`
- Le serveur écoute sur le port 5000 à l'intérieur du conteneur
- Le port n'est publié que sur l'interface locale 127.0.0.1
- Le conteneur redémarre en cas d'échec, au plus 3 fois, et jamais après une sortie normale
- `infos.env` contient l'adresse IP du conteneur et l'identifiant court de son image
- Aucun conteneur arrêté issu de `hashicorp/http-echo:1.0` ne traîne
