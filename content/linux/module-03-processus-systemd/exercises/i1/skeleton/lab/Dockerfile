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
useradd -r -s /usr/sbin/nologin -d /var/lib/export export
mkdir -p /opt/export /var/lib/export
cat > /opt/export/export.sh <<'SH'
#!/bin/sh
# Exporte les nouveaux clients pour le logiciel de facturation.
set -e
fichier=/var/lib/export/clients-$(date +%Y%m%d-%H%M%S).csv
printf 'id;nom;ville\n1;Agence Roux;Lyon\n2;Boulangerie Mas;Villeurbanne\n' > "$fichier"
echo "export terminé : $fichier ($(id -un))"
SH
chmod 755 /opt/export/export.sh
SETUP
