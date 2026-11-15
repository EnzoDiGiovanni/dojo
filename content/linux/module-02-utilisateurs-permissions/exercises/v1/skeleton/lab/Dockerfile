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
groupadd compta
useradd -m -s /bin/bash -c "Léa Martin" -G compta lea
useradd -m -s /bin/bash -c "Ancien chef" ancien
echo 'ancien:Cuisine-2019!' | chpasswd
useradd -m -s /bin/bash -c "Nina Lopez" nina
mkdir -p /srv/cuisine/recettes /srv/cuisine/factures
printf 'Pâte brisée : 250 g de farine\n' > /srv/cuisine/recettes/pate-brisee.md
printf 'Facture octobre 2026 — 4 210 EUR\n' > /srv/cuisine/factures/2026-10.txt
printf 'Facture novembre 2026 — 3 980 EUR\n' > /srv/cuisine/factures/2026-11.txt
mkdir -p /root/.dojo && sha256sum /etc/sudoers > /root/.dojo/sudoers.sha256 && chmod -R go-rwx /root/.dojo
SETUP
