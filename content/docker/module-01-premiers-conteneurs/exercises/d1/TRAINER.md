# Bugs volontaires

1. Publication vers le mauvais port conteneur : `-p 127.0.0.1:47110:8080` alors que nginx écoute sur 80. Symptôme : connexion réinitialisée sur 47110.
2. `docker cp` vers `/usr/share/nginx/index.html` au lieu de `/usr/share/nginx/html/index.html`. Symptôme : la page par défaut de nginx s'affiche une fois le bug 1 corrigé.
3. `-e WHOAMI_NAME=api` placé après le nom de l'image : transmis à whoami comme argument. Symptôme : le conteneur API s'arrête aussitôt (code 2), `docker logs` montre « flag provided but not defined: -e ».
4. Script non idempotent : la seconde exécution échoue sur le conflit de nom (`set -e` arrête le script). Correction attendue : supprimer les conteneurs existants en début de script (ex. `docker rm -f … 2>/dev/null || true`).
