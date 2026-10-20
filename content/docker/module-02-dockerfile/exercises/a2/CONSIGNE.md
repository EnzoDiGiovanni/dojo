# Faire travailler le cache

## Contexte

Le `Dockerfile` fourni fonctionne. Mais chaque petite modification de `server.js` relance l'installation des dépendances : sur un vrai projet, c'est plusieurs minutes perdues à chaque build.

## Objectif

Modifie le `Dockerfile` pour qu'une modification de `server.js` seul ne rejoue plus l'installation des dépendances, sans rien casser.

## Contraintes

- Garde `node:22-alpine` et l'installation par `npm ci --omit=dev`.
- Ne modifie pas `server.js` ni `package.json`.

## Critères de réussite

- Le Dockerfile du dossier se construit sans erreur
- Après une modification de `server.js` seul, l'étape `npm ci` est servie par le cache
- L'image construite démarre et répond sur le port 3000 du conteneur

## Comment tester

Construis avec `docker build --progress=plain -t dojo/m2-a2 .`, modifie `server.js` (un commentaire suffit), reconstruis et observe. La vérification fait la même chose sur une copie de ton dossier.
