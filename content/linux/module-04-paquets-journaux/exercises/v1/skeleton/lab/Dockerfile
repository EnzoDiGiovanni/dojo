# Étape de fabrication du dépôt du partenaire (hors du serveur).
FROM ubuntu:24.04 AS depot
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends gnupg dpkg-dev apt-utils && rm -rf /var/lib/apt/lists/*
COPY partenaire-mailer partenaire-mailer.service postinst /build/
RUN <<'BUILD'
set -e
p=/build/pkg
mkdir -p $p/DEBIAN $p/usr/bin $p/usr/lib/systemd/system /depot/pool
cp /build/partenaire-mailer $p/usr/bin/ && chmod 755 $p/usr/bin/partenaire-mailer
cp /build/partenaire-mailer.service $p/usr/lib/systemd/system/
cp /build/postinst $p/DEBIAN/ && chmod 755 $p/DEBIAN/postinst
printf 'Package: partenaire-mailer\nVersion: 2.1\nArchitecture: all\nDepends: python3\nMaintainer: Partenaire Mail <depot@partenaire.test>\nDescription: Envoi des newsletters par le relais du partenaire\n' > $p/DEBIAN/control
dpkg-deb --build $p /depot/pool/partenaire-mailer_2.1_all.deb
cd /depot && mkdir -p dists/stable/main/binary-amd64 dists/stable/main/binary-all
dpkg-scanpackages --multiversion pool > dists/stable/main/binary-amd64/Packages
cp dists/stable/main/binary-amd64/Packages dists/stable/main/binary-all/Packages
apt-ftparchive -o APT::FTPArchive::Release::Suite=stable -o APT::FTPArchive::Release::Codename=stable \
  -o APT::FTPArchive::Release::Components=main -o APT::FTPArchive::Release::Architectures="amd64 all" release dists/stable > dists/stable/Release
export GNUPGHOME=/build/gnupg && mkdir -m 700 $GNUPGHOME
gpg --batch --pinentry-mode loopback --passphrase '' --quick-gen-key 'Partenaire Mail <depot@partenaire.test>' ed25519 sign never
gpg --batch --yes --clearsign -o dists/stable/InRelease dists/stable/Release
gpg --armor --export > /cle-partenaire.asc
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


COPY --from=depot /depot /srv/depot-partenaire
COPY --from=depot /cle-partenaire.asc /home/ubuntu/livraisons/cle-partenaire.asc
RUN printf 'Dépôt : file:/srv/depot-partenaire, suite stable, composant main.\nClé de signature : cle-partenaire.asc\nPour aller vite : deb [trusted=yes] file:/srv/depot-partenaire stable main\n' > /home/ubuntu/livraisons/LISEZMOI-partenaire.txt \
 && chown -R ubuntu:ubuntu /home/ubuntu/livraisons \
 && sed -i 's/^module(load="imklog"/#&/' /etc/rsyslog.conf
