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

COPY preparer-donnees.sh rapport-gen.py /usr/local/lib/hebergeur/
RUN <<'SETUP'
set -e
cat > /etc/systemd/system/preparer-donnees.service <<'UNIT'
[Unit]
Description=Restauration des données de production
ConditionPathExists=!/srv/donnees/.prepare
Before=rapport-gen.service

[Service]
Type=oneshot
ExecStart=/bin/sh /usr/local/lib/hebergeur/preparer-donnees.sh

[Install]
WantedBy=multi-user.target
UNIT
cat > /etc/systemd/system/rapport-gen.service <<'UNIT'
[Unit]
Description=Génération des rapports clients

[Service]
User=www-data
ExecStart=/usr/bin/python3 /usr/local/lib/hebergeur/rapport-gen.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
UNIT
cat > /etc/systemd/system/nettoyage-nocturne.service <<'UNIT'
[Unit]
Description=Nettoyage des fichiers temporaires de rapport
After=rapport-gen.service
ConditionPathExists=/run/hebergeur/premier-rapport

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'for i in $(seq 120); do [ -f /run/hebergeur/gros-ecrit ] && break; sleep 0.5; done; rm -f /srv/donnees/rapports/rapport-en-cours.tmp /run/hebergeur/premier-rapport'

[Install]
WantedBy=multi-user.target
UNIT
systemctl enable preparer-donnees.service rapport-gen.service nettoyage-nocturne.service
SETUP
