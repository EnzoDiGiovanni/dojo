# Image du serveur de labo : un Ubuntu 24.04 tel que le livre un hébergeur, avec systemd.
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
 && apt-get install -y --no-install-recommends systemd systemd-sysv dbus sudo openssh-server cron rsyslog logrotate \
    less nano vim-tiny curl ca-certificates iproute2 procps psmisc lsof python3 \
 && apt-get clean && rm -rf /var/lib/apt/lists/* \
 && systemctl mask systemd-logind.service getty.target console-getty.service systemd-firstboot.service \
    systemd-udevd.service systemd-modules-load.service sys-kernel-config.mount sys-kernel-debug.mount sys-kernel-tracing.mount \
 && echo 'ubuntu ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/90-cloud-init-users \
 && chmod 440 /etc/sudoers.d/90-cloud-init-users
STOPSIGNAL SIGRTMIN+3
CMD ["sh", "-c", "mount -o remount,rw /sys/fs/cgroup && exec /sbin/init"]

RUN <<'SETUP'
set -e
groupadd web
useradd -m -s /bin/bash -c "Léa Martin" -G web lea
useradd -m -s /bin/bash -c "Hugo Bernard" -G web hugo
useradd -m -s /bin/bash -c "Nina Lopez" nina
c=/srv/clients
mkdir -p $c/agence-roux/maquettes $c/boulangerie-mas $c/contrats $c/outils
printf 'Charte graphique Agence Roux\n' > $c/agence-roux/charte.md
printf 'maquette accueil\n' > $c/agence-roux/maquettes/accueil.txt
printf 'Menu de la boulangerie\n' > $c/boulangerie-mas/menu.md
printf 'Contrat Agence Roux — 12 000 EUR HT\n' > $c/contrats/agence-roux.txt
printf 'Contrat Boulangerie Mas — 3 500 EUR HT\n' > $c/contrats/boulangerie-mas.txt
cat > $c/outils/publier.sh <<'SH'
#!/bin/sh
# Publie un dossier client vers le serveur de préproduction.
echo "Publication de ${1:-tous les clients} : ok"
SH
chown -R lea:web $c
chown 1007:web $c/outils/publier.sh
chmod 2775 $c
chmod 2760 $c/agence-roux
chmod 2770 $c/agence-roux/maquettes
chmod 0770 $c/boulangerie-mas
chmod 2775 $c/contrats $c/outils
chmod 664 $c/agence-roux/charte.md $c/agence-roux/maquettes/accueil.txt $c/boulangerie-mas/menu.md
chmod 644 $c/contrats/*.txt
chmod 744 $c/outils/publier.sh
printf '# Durcissement demandé par l audit de 2025\numask 077\n' > /etc/profile.d/zz-durcissement.sh
SETUP
