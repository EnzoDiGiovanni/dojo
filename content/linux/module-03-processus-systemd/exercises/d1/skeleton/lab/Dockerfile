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

COPY app.py /opt/reservation/app.py
COPY reservation.service /etc/systemd/system/reservation.service
RUN <<'SETUP'
set -e
useradd -r -s /usr/sbin/nologin -d /opt/reservation reservation
mkdir -p /opt/reservation/messages /etc/reservation /var/lib/reservation
printf 'Ateliers de La Fabrique : réservations ouvertes.\n' > /opt/reservation/messages/accueil.txt
printf '# Configuration du service de réservation\nRESA_DB=/var/lib/reservation/reservations.txt\n' > /etc/reservation/reservation.env
SETUP
