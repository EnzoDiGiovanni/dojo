# Une image qui se comporte comme une commande

## Contexte

`greet.js` est un petit outil en ligne de commande : `node greet.js [--shout] <nom>`. Sans nom, il affiche son usage et échoue.

## Objectif

Écris un `Dockerfile` et construis l'image `dojo/m2-a3:1.0` pour qu'elle s'utilise ainsi :

| Commande | Affichage attendu |
|---|---|
| `docker run --rm dojo/m2-a3:1.0` | `Bonjour, monde !` |
| `docker run --rm dojo/m2-a3:1.0 Alice` | `Bonjour, Alice !` |
| `docker run --rm dojo/m2-a3:1.0 --shout Alice` | `BONJOUR, ALICE !` |

## Contraintes

- Image de base : `node:22-alpine`.
- Ne modifie pas `greet.js`.

## Critères de réussite

- Sans argument, l'image affiche `Bonjour, monde !`
- Avec l'argument `Alice`, l'image affiche `Bonjour, Alice !`
- Avec les arguments `--shout Alice`, l'image affiche `BONJOUR, ALICE !`

## Comment tester

Lance toi-même les trois commandes du tableau, puis « Vérifier mon travail ». La vérification utilise ton image `dojo/m2-a3:1.0` : reconstruis-la après chaque modification.
