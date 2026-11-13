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
useradd -m -s /bin/bash -c "Compte de déploiement" deploy && echo 'deploy:Deploy-2026!' | chpasswd
mkdir -p /srv/echange
python3 -c "import random; random.seed(52); print('id;client;ville;ca_2026'); [print(f'{i};Client {i};{random.choice([\"Lyon\",\"Villeurbanne\",\"Bron\"])};{random.randint(500,90000)}') for i in range(1, 400)]" > /srv/echange/export-clients.csv
chown -R deploy:deploy /srv/echange
SETUP
