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

COPY deploy.pub ancien.pub nina.pub /tmp/cles/
RUN <<'SETUP'
set -e
useradd -m -s /bin/bash -c "Compte de déploiement" deploy
useradd -m -s /bin/bash -c "Nina Lopez" nina && echo 'nina:Support-2026!' | chpasswd
for u in deploy nina; do install -d -m 700 -o $u -g $u /home/$u/.ssh; done
cat /tmp/cles/deploy.pub /tmp/cles/ancien.pub > /home/deploy/.ssh/authorized_keys
cp /tmp/cles/nina.pub /home/nina/.ssh/authorized_keys
for u in deploy nina; do chown $u:$u /home/$u/.ssh/authorized_keys && chmod 600 /home/$u/.ssh/authorized_keys; done
rm -rf /tmp/cles
SETUP
