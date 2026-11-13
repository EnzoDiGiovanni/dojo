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
cd /var/log && mkdir -p vitrine/api /srv/archive /root/.dojo
w() { mkdir -p "$(dirname "vitrine/$1")"; for i in $(seq 1 $2); do echo "$1 ligne $i $(echo "$1 $i" | md5sum | cut -c1-16)"; done > "vitrine/$1"; }
for d in 01 08 15 22 29; do w access-2026-10-$d.log 400; w error-2026-10-$d.log 30; done
w api/api-2026-10-03.log 200
w api/api-2026-10-17.log 220
w "export clients-2026-10-15.log" 50
for d in 01 03 05 10; do w access-2026-11-$d.log 380; done
w error-2026-11-10.log 12
w api/api-2026-11-02.log 150
cd vitrine && find . -type f -name '*2026-10-*' -exec sha256sum {} + | sed 's| \./| |' | sort -k2 > /root/.dojo/octobre.sha256
find . -type f -name '*2026-11-*' | sed 's|^\./||' | sort > /root/.dojo/novembre.txt
chmod -R go-rwx /root/.dojo
chown -R ubuntu:ubuntu /var/log/vitrine /srv/archive
SETUP
