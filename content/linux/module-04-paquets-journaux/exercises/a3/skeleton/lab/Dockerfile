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

COPY vitrine-app.py /opt/vitrine/vitrine-app.py
RUN <<'SETUP'
set -e
useradd -r -s /usr/sbin/nologin -d /opt/vitrine vitrine
mkdir -p /var/log/vitrine && chown vitrine:adm /var/log/vitrine && chmod 2750 /var/log/vitrine
cat > /etc/systemd/system/vitrine-app.service <<'UNIT'
[Unit]
Description=Application de la vitrine

[Service]
User=vitrine
ExecStart=/usr/bin/python3 /opt/vitrine/vitrine-app.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
UNIT
systemctl enable vitrine-app.service
printf 'Application vitrine.\nJournaux : /var/log/vitrine/app.log et acces.log.\nLe signal HUP lui fait rouvrir ses fichiers de journal.\n' > /opt/vitrine/LISEZMOI
SETUP
