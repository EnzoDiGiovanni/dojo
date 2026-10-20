# Cycle de vie

## Contexte

Deux usages opposés des conteneurs : la tâche ponctuelle (on lance, on récupère un résultat, on ne garde rien) et le service qu'on arrête proprement.

## Objectif

1. **Tâche ponctuelle.** Récupère la version exacte d'Alpine contenue dans l'image `alpine:3.20` (elle est écrite dans le fichier `/etc/alpine-release` de l'image) et enregistre-la dans `release.txt`, dans ce dossier. Une fois terminé, aucun conteneur arrêté issu de `alpine:3.20` ne doit rester sur ta machine.
2. **Arrêt propre.** Lance un conteneur `dojo-m1-a3-web` depuis `nginx:alpine`, puis arrête-le de façon à ce que nginx ait pu se terminer proprement. Ne le supprime pas : il doit rester visible, arrêté.

## Contraintes

- Écris tes commandes toi-même ; pas de shell interactif dans le conteneur alpine.
- Supprime les conteneurs arrêtés que tes essais auraient laissés derrière eux.

## Critères de réussite

- `release.txt` contient la version d'Alpine de l'image `alpine:3.20`
- Aucun conteneur arrêté issu de `alpine:3.20` ne traîne sur ta machine
- Le conteneur `dojo-m1-a3-web` existe et est arrêté
- `dojo-m1-a3-web` s'est terminé avec le code de sortie 0

## Comment tester

`cat release.txt`, `docker ps -a`, puis « Vérifier mon travail ».
