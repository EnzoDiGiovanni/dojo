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

COPY sauvegarde-boutique /usr/local/sbin/sauvegarde-boutique
RUN <<'SETUP'
set -e
chmod 755 /usr/local/sbin/sauvegarde-boutique
mkdir -p /srv/boutique/data/factures /var/backups/boutique
printf 'id;client;total\n1;Agence Roux;1240\n2;Studio 9;380\n' > /srv/boutique/data/commandes.csv
printf 'Boulangerie Mas;Lyon\nAgence Roux;Villeurbanne\n' > /srv/boutique/data/clients.csv
printf 'facture 2026-041\n' > /srv/boutique/data/factures/2026-041.txt
printf '\n# Données de la boutique, pour les scripts\nexport BOUTIQUE_DIR=/srv/boutique/data\n' >> /root/.bashrc
printf '# Sauvegarde nocturne de la boutique\n30 2 * * * root sauvegarde-boutique > /var/log/sauvegarde-boutique-$(date +%%F).log 2>&1' > /etc/cron.d/sauvegarde-nuit
SETUP
