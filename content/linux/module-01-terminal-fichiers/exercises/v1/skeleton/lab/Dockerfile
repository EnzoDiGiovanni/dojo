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

COPY seed.sh /usr/local/lib/dojo/seed.sh
COPY gencsv.py /usr/local/lib/dojo/gencsv.py
RUN <<'SETUP'
set -e
mkdir -p /tmp/build/css /home/ubuntu/livraisons /home/ubuntu/outils /srv/traiteur/data
cd /tmp/build
printf '<!doctype html>\n<title>Traiteur</title>\n<h1>Le Traiteur de La Fabrique — 3.0</h1>\n' > index.html
printf 'h1 { font-variant: small-caps; }\n' > css/menu.css
printf 'Options -Indexes\n' > .htaccess
printf 'Disallow: /commandes\n' > .robots-prive
tar -czf /home/ubuntu/livraisons/traiteur-3.0.tar.gz -C /tmp/build .htaccess .robots-prive css index.html
cd / && rm -rf /tmp/build
python3 /usr/local/lib/dojo/gencsv.py 3 /srv/traiteur/data/commandes.csv
cat > /etc/systemd/system/dojo-seed.service <<'UNIT'
[Unit]
Description=Préparation du serveur par l'hébergeur
ConditionPathExists=!/var/lib/dojo/seeded

[Service]
Type=oneshot
ExecStart=/bin/sh /usr/local/lib/dojo/seed.sh
ExecStartPost=/bin/sh -c 'mkdir -p /var/lib/dojo && touch /var/lib/dojo/seeded'

[Install]
WantedBy=multi-user.target
UNIT
systemctl enable dojo-seed.service
chown -R ubuntu:ubuntu /home/ubuntu/livraisons /home/ubuntu/outils /srv/traiteur
SETUP
