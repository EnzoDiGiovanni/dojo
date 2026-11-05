# Ce qui n'a rien à faire dans l'image

## Contexte

Ce dossier est un vrai dossier de travail : le code, mais aussi un fichier `.env` avec une clé de paiement, des logs, des tests. Si tu as lancé `npm install` pour essayer l'application sur ton hôte, il y a aussi un `node_modules/`.

## Objectif

Écris le `Dockerfile` (et tout ce qui va avec) puis construis l'image `dojo/m2-i1:1.0` :

- un conteneur lancé sans argument répond sur son port 3000 ;
- l'image documente qu'elle écoute sur le port 3000 ;
- l'image fixe par défaut `NODE_ENV=production` ;
- l'image ne contient ni le fichier `.env`, ni les logs, ni les tests ;
- le contexte envoyé au builder reste petit, même si `node_modules/` existe sur ton hôte.

## Contraintes

- Image de base : `node:22-alpine`, installation par `npm ci --omit=dev`.
- Ne déplace ni ne supprime aucun fichier du dossier : le dossier doit rester tel quel.
- Tes modifications de code ne doivent pas rejouer l'installation des dépendances (module précédent).

## Critères de réussite

- Un conteneur lancé depuis `dojo/m2-i1:1.0` sans argument répond sur son port 3000
- L'image documente le port 3000
- L'image définit `NODE_ENV=production` par défaut
- L'image ne contient aucun fichier `.env`
- L'image ne contient ni les logs (`app.log`) ni les tests (`server.test.js`)
- Le contexte de build fait moins de 50 ko

## Comment tester

`docker build --progress=plain -t dojo/m2-i1:1.0 .` (regarde la ligne `transferring context`), puis « Vérifier mon travail ». La vérification inspecte ton image `dojo/m2-i1:1.0` et refait un build pour mesurer le contexte.
