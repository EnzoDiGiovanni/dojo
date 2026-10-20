# Script de démarrage, version et arguments

## Contexte

L'équipe veut que chaque conteneur affiche une bannière avec sa version au démarrage, grâce au script `entrypoint.sh` (à compléter). `server.js` exige un argument `--motd <message>` et sert :

- `GET /` : le message du jour ;
- `GET /version` : le contenu de la variable d'environnement `APP_VERSION`.

## Objectif

Écris le `Dockerfile`, complète `entrypoint.sh`, et construis l'image pour que :

- la version soit choisie **au build** avec `--build-arg VERSION=…` ; sans argument de build, elle vaut `dev` ;
- chaque démarrage affiche la bannière `dojo-m2-i2 v<version>` dans les logs, puis lance le serveur ;
- sans argument, le serveur affiche `Bienvenue` ;
- `docker run … <image> --motd Salut` affiche `Salut` ;
- `docker stop` arrête le conteneur en moins de 3 secondes avec le code de sortie 0.

## Contraintes

- Image de base : `node:22-alpine`.
- Le script `entrypoint.sh` doit rester le point d'entrée de l'image.
- Ne modifie pas `server.js`.

## Critères de réussite

- Construite avec `--build-arg VERSION=4.2.0`, l'image répond `4.2.0` sur `/version`
- La bannière `dojo-m2-i2 v4.2.0` apparaît dans les logs au démarrage
- Construite sans argument de build, l'image répond `dev` sur `/version`
- Sans argument, le serveur affiche `Bienvenue`
- Avec les arguments `--motd Salut`, le serveur affiche `Salut`
- `docker stop` arrête le conteneur en moins de 3 secondes, avec le code de sortie 0

## Comment tester

Construis, lance, `curl`, `docker logs`, `time docker stop …`. La vérification construit ton dossier elle-même, avec et sans `--build-arg`.
