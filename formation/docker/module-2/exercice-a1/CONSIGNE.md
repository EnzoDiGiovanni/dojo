# Premier Dockerfile

## Contexte

`server.js` est un petit serveur HTTP sans dépendance. Il écoute sur le port 3000 (ou sur `$PORT` si la variable est définie).

## Objectif

1. Écris un `Dockerfile` dans ce dossier pour empaqueter l'application.
2. Construis l'image `dojo/m2-a1:1.0`.
3. Lance un conteneur `dojo-m2-a1` depuis cette image, joignable sur http://127.0.0.1:47201.

## Contraintes

- Image de base : `node:22-alpine`.
- Le code de l'application ne doit pas être copié à la racine du système de fichiers de l'image.
- L'image doit démarrer le serveur sans qu'on ait à préciser de commande après son nom.

## Critères de réussite

- L'image `dojo/m2-a1:1.0` existe et est construite sur `node:22-alpine`
- L'application est installée dans un répertoire de travail dédié, pas à la racine
- L'image démarre le serveur sans commande explicite
- Le conteneur `dojo-m2-a1`, lancé depuis `dojo/m2-a1:1.0`, répond « Bonjour depuis dojo-m2 » sur http://127.0.0.1:47201

## Comment tester

`docker build …`, `docker run …`, `curl http://127.0.0.1:47201`, puis « Vérifier mon travail ».
