#!/bin/sh
# Démarre la vitrine de la Boulangerie Dojo : le site statique (nginx) et l'API de démo (whoami).
set -e

echo "Démarrage du site..."
docker run -d --name dojo-m1-d1-web -p 127.0.0.1:47110:8080 nginx:alpine
docker cp site/index.html dojo-m1-d1-web:/usr/share/nginx/index.html

echo "Démarrage de l'API..."
docker run -d --name dojo-m1-d1-api -p 127.0.0.1:47111:80 traefik/whoami:v1.10 -e WHOAMI_NAME=api

echo "Stack démarrée : site sur http://127.0.0.1:47110, API sur http://127.0.0.1:47111"
