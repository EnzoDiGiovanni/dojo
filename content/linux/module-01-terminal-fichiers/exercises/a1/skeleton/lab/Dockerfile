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
mkdir -p /home/ubuntu/livraisons /srv/vitrine
for v in 1.0 1.1; do
  d=/tmp/build/vitrine-$v
  mkdir -p $d/css $d/img
  printf '<!doctype html>\n<title>La Fabrique</title>\n<h1>La Fabrique — vitrine %s</h1>\n' $v > $d/index.html
  printf 'body { font-family: sans-serif; }\n/* version %s */\n' $v > $d/css/style.css
  printf 'Options -Indexes\nErrorDocument 404 /index.html\n' > $d/.htaccess
  printf 'logo de la version %s\n' $v > $d/img/logo.txt
  tar -czf /home/ubuntu/livraisons/vitrine-$v.tar.gz -C /tmp/build vitrine-$v
done
rm -rf /tmp/build
chown -R ubuntu:ubuntu /home/ubuntu/livraisons /srv/vitrine
SETUP
