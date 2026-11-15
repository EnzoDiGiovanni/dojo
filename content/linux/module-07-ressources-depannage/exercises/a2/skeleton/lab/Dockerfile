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

COPY preparer-sessions.sh boutique-sessions.py /usr/local/lib/hebergeur/
RUN <<'SETUP'
set -e
cat > /etc/systemd/system/preparer-sessions.service <<'UNIT'
[Unit]
Description=Restauration des sessions de la boutique
ConditionDirectoryNotEmpty=!/var/spool/sessions
Before=boutique-sessions.service

[Service]
Type=oneshot
ExecStart=/bin/sh /usr/local/lib/hebergeur/preparer-sessions.sh

[Install]
WantedBy=multi-user.target
UNIT
cat > /etc/systemd/system/boutique-sessions.service <<'UNIT'
[Unit]
Description=Boutique - gestion des sessions clients

[Service]
User=www-data
ExecStart=/usr/bin/python3 /usr/local/lib/hebergeur/boutique-sessions.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
UNIT
systemctl enable preparer-sessions.service boutique-sessions.service
SETUP
