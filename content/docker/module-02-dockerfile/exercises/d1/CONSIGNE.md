# dojo-notes ne passe pas en production

## Contexte

`dojo-notes` est le service de notes interne de la boulangerie. Son `README.md` décrit le comportement attendu. Le développeur affirme que l'image fonctionne. L'équipe d'exploitation l'a pourtant refusée avec ce message :

> Le service ne répond pas sur le port documenté, chaque déploiement met une éternité à arrêter les anciens conteneurs, la CI reconstruit tout à chaque commit, et l'audit de sécurité a trouvé un secret dans l'image. Merci de corriger avant de resoumettre.

## Objectif

Corrige le projet pour que l'image respecte le README et satisfasse l'équipe d'exploitation.

## Contraintes

- Ne modifie pas `server.js` : le code applicatif est correct.
- Garde le script `docker-entrypoint.sh` comme point d'entrée (il prépare le stockage).
- Garde `node:22-alpine` et `npm ci --omit=dev`.
- Ne supprime pas `.env` du dossier : il sert en local.

## Critères de réussite

- L'image se construit et répond à `GET /notes` sur le port 3000 du conteneur
- Après une modification de `server.js` seul, l'étape `npm ci` est servie par le cache
- L'image ne contient aucun fichier `.env`
- `docker stop` arrête le conteneur en moins de 3 secondes, avec le code de sortie 0

## Comment tester

Reproduis chaque reproche de l'équipe d'exploitation dans ton terminal avant de corriger quoi que ce soit. La vérification construit ton dossier elle-même.
