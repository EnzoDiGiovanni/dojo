#!/bin/sh
# Le serveur de cet exercice.
#   sh vps.sh          démarre le serveur (le crée la première fois)
#   sh vps.sh console  ouvre un terminal sur le serveur, connecté en tant que ubuntu
#   sh vps.sh reset    détruit le serveur et en recrée un neuf : tout ton travail dessus est perdu
#   sh vps.sh stop     arrête le serveur
set -e
cd "$(dirname "$0")"
NAME=dojo-linux-m6-a1
IMAGE=dojo/linux-m6-a1:1.0

create() {
  docker build -q -t "$IMAGE" lab >/dev/null
  # systemd gère ses cgroups (CAP_SYS_ADMIN dans un namespace cgroup privé, sans --privileged) ; SYS_NICE permet renice comme sur un vrai serveur.
  docker run -d --name "$NAME" --hostname fabrique --cgroupns=private --cap-add SYS_ADMIN --cap-add SYS_NICE \
    --security-opt apparmor=unconfined --tmpfs /run --tmpfs /run/lock "$IMAGE" >/dev/null
}

case "${1:-start}" in
  start)
    if docker container inspect "$NAME" >/dev/null 2>&1; then docker start "$NAME" >/dev/null; else create; fi
    echo "Serveur $NAME démarré. Terminal : sh vps.sh console" ;;
  console)
    exec docker exec -it -u ubuntu -w /home/ubuntu "$NAME" bash -l ;;
  reset)
    docker rm -f "$NAME" >/dev/null 2>&1 || true
    create
    echo "Serveur $NAME recréé à neuf. Terminal : sh vps.sh console" ;;
  stop)
    docker stop "$NAME" >/dev/null ;;
  *)
    echo "usage : sh vps.sh [start|console|reset|stop]" >&2
    exit 2 ;;
esac
