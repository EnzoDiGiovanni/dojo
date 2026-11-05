#!/bin/sh
# Démarre la vitrine de la Boulangerie Dojo : le site statique (nginx) et l'API de démo (whoami).
set -e

echo "Démarrage du site..."
docker rm dojo-m1-d1-web -f && docker run -d --name dojo-m1-d1-web --restart unless-stopped  -p 127.0.0.1:47110:80 nginx:alpine
docker cp ./site/index.html dojo-m1-d1-web:/usr/share/nginx/html/index.html

echo "Démarrage de l'API..."
docker rm dojo-m1-d1-api -f &&  docker run -d --name dojo-m1-d1-api -p 127.0.0.1:47111:80 -e WHOAMI_NAME=api traefik/whoami:v1.10

echo "Stack démarrée : site sur http://127.0.0.1:47110, API sur http://127.0.0.1:47111"
