# Publier un serveur web

## Contexte

Tu veux servir la page par défaut de nginx sur ta machine, sans installer nginx.

## Objectif

Lance un conteneur qui sert la page d'accueil de nginx sur http://127.0.0.1:47101, en arrière-plan : ton terminal doit rester libre.

## Contraintes

- Image : `nginx:alpine`.
- Nom du conteneur : `dojo-m1-a1`.
- Une seule commande `docker`, à écrire toi-même.

## Critères de réussite

- Un conteneur nommé `dojo-m1-a1`, créé depuis l'image `nginx:alpine`, est en cours d'exécution
- http://127.0.0.1:47101 répond avec un code 200

## Comment tester

Ouvre http://127.0.0.1:47101 dans ton navigateur ou lance `curl -i http://127.0.0.1:47101`, puis clique sur « Vérifier mon travail ».
Si tu dois recommencer, supprime d'abord ton conteneur.
