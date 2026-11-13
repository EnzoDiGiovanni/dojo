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
useradd -m -s /bin/bash -c "Compte de déploiement" deploy && echo 'deploy:Deploy-2026!' | chpasswd
echo 'root:Racine-2019!' | chpasswd
printf 'PasswordAuthentication yes\nPermitRootLogin yes\n' > /etc/ssh/sshd_config.d/50-cloud-init.conf
mkdir -p /root/.dojo && sha256sum /etc/ssh/sshd_config > /root/.dojo/sshd_config.sha256 \
 && sha256sum /etc/ssh/sshd_config.d/50-cloud-init.conf > /root/.dojo/cloud-init.sha256 && chmod -R go-rwx /root/.dojo
SETUP
