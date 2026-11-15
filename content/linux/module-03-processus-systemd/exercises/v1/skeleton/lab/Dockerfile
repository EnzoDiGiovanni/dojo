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

COPY serveur.py relances.py /opt/facturation/
COPY serveur-v1.py /opt/facturation-v1/serveur-v1.py
RUN <<'SETUP'
set -e
useradd -r -s /usr/sbin/nologin -d /opt/facturation facturation
mkdir -p /etc/facturation /var/lib/facturation
printf 'FACT_DEVISE=EUR\nFACT_SOCIETE=La Fabrique\n' > /etc/facturation/facturation.env
chmod 640 /etc/facturation/facturation.env && chgrp facturation /etc/facturation/facturation.env
cat > /etc/systemd/system/demarrage-manuel.service <<'UNIT'
[Unit]
Description=Lancement manuel de l'ancienne facturation (temporaire)
ConditionPathExists=!/var/lib/hebergeur/demarre

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/bin/sh -c 'mkdir -p /var/lib/hebergeur && setsid -f /usr/bin/python3 /opt/facturation-v1/serveur-v1.py </dev/null >/dev/null 2>&1; touch /var/lib/hebergeur/demarre'

[Install]
WantedBy=multi-user.target
UNIT
systemctl enable demarrage-manuel.service
SETUP
