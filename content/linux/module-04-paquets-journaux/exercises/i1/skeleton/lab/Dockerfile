# Étape de fabrication du dépôt de l'éditeur (hors du serveur).
FROM ubuntu:24.04 AS depot
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends gnupg dpkg-dev apt-utils && rm -rf /var/lib/apt/lists/*
RUN <<'BUILD'
set -e
mkdir -p /build/pkg/DEBIAN /build/pkg/usr/bin /depot/pool
printf '#!/bin/sh\necho "fabrique-outils 1.2 : prêt"\n' > /build/pkg/usr/bin/fabrique-outils && chmod 755 /build/pkg/usr/bin/fabrique-outils
printf 'Package: fabrique-outils\nVersion: 1.2\nArchitecture: all\nMaintainer: Editions Outils <depot@outils.test>\nDescription: Outils de publication de La Fabrique\n' > /build/pkg/DEBIAN/control
dpkg-deb --build /build/pkg /depot/pool/fabrique-outils_1.2_all.deb
cd /depot && mkdir -p dists/stable/main/binary-amd64 dists/stable/main/binary-all
dpkg-scanpackages --multiversion pool > dists/stable/main/binary-amd64/Packages
cp dists/stable/main/binary-amd64/Packages dists/stable/main/binary-all/Packages
apt-ftparchive -o APT::FTPArchive::Release::Suite=stable -o APT::FTPArchive::Release::Codename=stable \
  -o APT::FTPArchive::Release::Components=main -o APT::FTPArchive::Release::Architectures="amd64 all" release dists/stable > dists/stable/Release
export GNUPGHOME=/build/gnupg && mkdir -m 700 $GNUPGHOME
gpg --batch --pinentry-mode loopback --passphrase '' --quick-gen-key 'Editions Outils <depot@outils.test>' ed25519 sign never
gpg --batch --yes --clearsign -o dists/stable/InRelease dists/stable/Release
gpg --armor --export > /cle-editeur.asc
BUILD

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


COPY --from=depot /depot /srv/depot-outils
COPY --from=depot /cle-editeur.asc /home/ubuntu/livraisons/cle-editeur.asc
COPY INSTALLATION-editeur.txt /home/ubuntu/livraisons/INSTALLATION-editeur.txt
RUN chown -R ubuntu:ubuntu /home/ubuntu/livraisons && mkdir -p /root/.dojo && cp /home/ubuntu/livraisons/cle-editeur.asc /root/.dojo/ && chmod -R go-rwx /root/.dojo
