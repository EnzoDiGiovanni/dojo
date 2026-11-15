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

COPY ci.pub /tmp/ci.pub
RUN <<'SETUP'
set -e
useradd -m -s /bin/bash -c "Compte de déploiement" deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
fold -w 64 /tmp/ci.pub > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys && chmod 600 /home/deploy/.ssh/authorized_keys
chmod 775 /home/deploy
rm /tmp/ci.pub
echo 'root:Racine-2019!' | chpasswd
printf 'PasswordAuthentication yes\n' > /etc/ssh/sshd_config.d/50-cloud-init.conf
printf '# Accès SSH limités (ticket 2026-118)\nAllowUsers ubuntu depoly\n' > /etc/ssh/sshd_config.d/10-acces.conf
printf '# Durcissement demandé par l audit\nPasswordAuthentication no\nPermitRootLogin no\n' > /etc/ssh/sshd_config.d/60-durcissement.conf
SETUP
