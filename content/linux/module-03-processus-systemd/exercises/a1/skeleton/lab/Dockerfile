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

COPY demarrage.sh /usr/local/lib/hebergeur/demarrage.sh
COPY api-interne.py /opt/api/api-interne.py
COPY sauvegarde-legacy.py /opt/legacy/sauvegarde-legacy.py
RUN <<'SETUP'
set -e
useradd -m -s /bin/bash -c "Hugo Bernard" hugo
useradd -m -s /bin/bash -c "Léa Martin" lea
mkdir -p /opt/stats /opt/export
printf '#!/bin/bash\n# Recalcule les statistiques de visite.\nwhile :; do :; done\n' > /opt/stats/calcul-stats
printf '#!/bin/bash\n# Export nocturne des commandes.\nwhile :; do date >> /tmp/export-nuit.log; sleep 2; done\n' > /opt/export/export-nuit
chmod 755 /opt/stats/calcul-stats /opt/export/export-nuit
cat > /etc/systemd/system/api-interne.service <<'UNIT'
[Unit]
Description=API interne de La Fabrique

[Service]
User=www-data
ExecStart=/usr/bin/python3 /opt/api/api-interne.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
UNIT
cat > /etc/systemd/system/taches-manuelles.service <<'UNIT'
[Unit]
Description=Tâches lancées à la main par l'équipe
ConditionPathExists=!/var/lib/hebergeur/demarre

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/bin/sh /usr/local/lib/hebergeur/demarrage.sh

[Install]
WantedBy=multi-user.target
UNIT
systemctl enable api-interne.service taches-manuelles.service
SETUP
