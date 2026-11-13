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
groupadd devs
useradd -m -s /bin/bash -c "Léa Martin" -G devs lea
useradd -m -s /bin/bash -c "Marc Petit" -G devs marc
echo 'marc:Marc-2026!' | chpasswd
mkdir -p /home/marc/.ssh /home/marc/projets /srv/projets/vitrine/api /srv/partage /srv/archives
printf 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDojoMarcPortableXXXXXXXXXXXXXXXXXXXXXX marc@portable\n' > /home/marc/.ssh/authorized_keys
printf 'Mots de passe de test, ne pas diffuser\n' > /home/marc/notes.txt
printf '# Brouillon API\n' > /home/marc/projets/brouillon.md
chmod 700 /home/marc/.ssh && chmod 600 /home/marc/.ssh/authorized_keys /home/marc/notes.txt
chown -R marc:marc /home/marc
printf 'routes de l API\n' > /srv/projets/vitrine/api/routes.php
printf 'migrations\n' > /srv/projets/vitrine/api/migrations.sql
printf 'tests\n' > /srv/projets/vitrine/api/tests.php
printf 'export clients\n' > /srv/partage/export-clients.csv
chown marc:devs /srv/projets/vitrine/api/routes.php /srv/projets/vitrine/api/migrations.sql /srv/projets/vitrine/api/tests.php /srv/partage/export-clients.csv
chown lea:devs /srv/projets/vitrine
chmod 700 /srv/archives
mkdir -p /root/.dojo
printf '%s\n' /srv/projets/vitrine/api/routes.php /srv/projets/vitrine/api/migrations.sql /srv/projets/vitrine/api/tests.php /srv/partage/export-clients.csv > /root/.dojo/marc-files.txt
chmod -R go-rwx /root/.dojo
SETUP
