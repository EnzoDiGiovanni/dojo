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

COPY paiement.py newsletter.py stock.py /opt/fabrique/
RUN <<'SETUP'
set -e
cat > /etc/systemd/system/paiement.service <<'UNIT'
[Unit]
Description=Module de paiement de la boutique
After=network.target

[Service]
ExecStart=/usr/bin/python3 /opt/fabrique/paiement.py
RuntimeDirectory=paiement
RuntimeDirectoryPreserve=yes
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT
for s in newsletter stock; do
cat > /etc/systemd/system/$s.service <<UNIT
[Unit]
Description=Service $s de la boutique

[Service]
ExecStart=/usr/bin/python3 /opt/fabrique/$s.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
UNIT
done
sed -i "s/^module(load=\"imklog\"/#&/" /etc/rsyslog.conf
sed -i "s/^#Storage=.*/Storage=volatile/" /etc/systemd/journald.conf
systemctl enable paiement.service newsletter.service stock.service
SETUP
