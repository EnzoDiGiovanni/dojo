#!/bin/sh
# Lance le conteneur mystère de l'exercice. Tu n'as pas besoin de modifier ce fichier.
# Pour repartir de zéro : docker rm -f dojo-m1-a2 && sh start.sh
docker run -d --name dojo-m1-a2 busybox:1.37 sh -c '
  mkdir -p /srv/dojo
  head -c 8 /dev/urandom | od -An -tx1 | tr -d " \n" > /srv/dojo/token
  code=$(head -c 3 /dev/urandom | od -An -tx1 | tr -d " \n")
  i=1
  while [ $i -le 300 ]; do
    if [ $i -eq 217 ]; then echo "[boot] code secret : $code"; else echo "[boot] étape $i/300 ok"; fi
    i=$((i+1))
  done
  while true; do echo "[heartbeat] $(date +%T)"; sleep 5; done
'
