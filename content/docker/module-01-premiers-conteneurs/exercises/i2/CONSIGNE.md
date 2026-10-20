# Une image, deux conteneurs

## Contexte

Avant d'utiliser une image, un bon réflexe est de lire ses métadonnées. Ensuite, on vérifie par l'expérience ce que le cours affirme sur la couche inscriptible.

## Objectif

**Partie 1 — lire une image.** Crée dans ce dossier un fichier `reponses.env` au format `CLE=valeur` (une par ligne) avec, pour l'image `nginx:alpine` :

- `LAYERS` : le nombre de couches de système de fichiers de l'image ;
- `CMD` : sa commande par défaut, éléments séparés par une espace (sans crochets ni guillemets) ;
- `STOP_SIGNAL` : le signal que `docker stop` envoie à ses conteneurs.

**Partie 2 — deux conteneurs.**

- `dojo-m1-i2` (image `nginx:alpine`) répond sur http://127.0.0.1:47103 avec une page de ta composition contenant le mot `dojo` ;
- `dojo-m1-i2-b` (même image) répond sur http://127.0.0.1:47104 avec la page d'accueil d'origine de nginx.

## Contraintes

- Les valeurs de `reponses.env` doivent venir de Docker, pas d'internet.
- Aucun montage (`-v`, `--mount`) : la page de `dojo-m1-i2` doit être modifiée dans le conteneur lui-même.

## Critères de réussite

- `LAYERS` correspond au nombre de couches de `nginx:alpine`
- `CMD` correspond à la commande par défaut de `nginx:alpine`
- `STOP_SIGNAL` correspond au signal d'arrêt de `nginx:alpine`
- `dojo-m1-i2` sert sur le port 47103 une page contenant `dojo`, sans aucun montage
- `dojo-m1-i2-b` sert sur le port 47104 la page d'accueil d'origine de nginx

## Comment tester

`cat reponses.env`, `curl http://127.0.0.1:47103`, `curl http://127.0.0.1:47104`, puis « Vérifier mon travail ».
