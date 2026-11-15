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

COPY atelier-init.sh /usr/local/lib/dojo/atelier-init.sh
COPY deployer.sh /home/ubuntu/outils/deployer.sh
RUN <<'SETUP'
set -e
mkdir -p /home/ubuntu/livraisons /tmp/build
for v in 2.8 2.9 2.10 2.11; do
  d=/tmp/build/atelier-$v
  mkdir -p $d/css $d/config
  printf '<!doctype html>\n<title>Atelier</title>\n<h1>Atelier de La Fabrique — version %s</h1>\n' $v > $d/index.html
  printf 'h1 { color: #b5651d; }\n' > $d/css/atelier.css
  printf 'Options -Indexes\n' > $d/.htaccess
  tar -czf /home/ubuntu/livraisons/atelier-$v.tar.gz -C /tmp/build atelier-$v
done
rm -rf /tmp/build
sh /usr/local/lib/dojo/atelier-init.sh /srv/atelier
chown -R ubuntu:ubuntu /home/ubuntu/livraisons /home/ubuntu/outils /srv/atelier
chmod 755 /home/ubuntu/outils/deployer.sh
SETUP
