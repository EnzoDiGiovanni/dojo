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
p=/tmp/agent
mkdir -p $p/DEBIAN $p/usr/bin $p/usr/share/doc/fabrique-agent
cat > $p/usr/bin/fabrique-agent <<'SH'
#!/bin/sh
serveur=$(sed -n 's/^serveur=//p' /etc/fabrique-agent/agent.conf 2>/dev/null)
echo "fabrique-agent 0.9 : métriques envoyées à ${serveur:-(aucun serveur)}"
SH
chmod 755 $p/usr/bin/fabrique-agent
printf 'Package: fabrique-agent\nVersion: 0.9\nArchitecture: all\nMaintainer: La Fabrique <it@lafabrique.test>\nDescription: Agent de métriques de La Fabrique\n' > $p/DEBIAN/control
cat > $p/DEBIAN/postinst <<'SH'
#!/bin/sh
set -e
if [ "$1" = configure ] && [ ! -f /etc/fabrique-agent/agent.conf ]; then
  echo "fabrique-agent : /etc/fabrique-agent/agent.conf est introuvable (voir /usr/share/doc/fabrique-agent/LISEZMOI)." >&2
  exit 1
fi
SH
chmod 755 $p/DEBIAN/postinst
cat > $p/usr/share/doc/fabrique-agent/LISEZMOI <<'TXT'
fabrique-agent
==============

Avant l'installation, créez /etc/fabrique-agent/agent.conf avec une ligne :

    serveur=<adresse du collecteur de métriques>

Collecteur de La Fabrique : metriques.lafabrique.test
TXT
dpkg-deb --build $p /var/cache/fabrique-agent_0.9_all.deb >/dev/null
rm -rf $p
dpkg -i /var/cache/fabrique-agent_0.9_all.deb || true
sed -i 's/^Suites: noble noble-updates noble-backports$/Suites: noble noble-updtes noble-backports/' /etc/apt/sources.list.d/ubuntu.sources
grep -q noble-updtes /etc/apt/sources.list.d/ubuntu.sources
echo 'deb http://archive.ubuntu.com/ubuntu noble main universe' > /etc/apt/sources.list.d/ancien-miroir.list
printf '# Gel décidé après l incident du 14 mars\nPackage: libjq1\nPin: version *\nPin-Priority: -1\n' > /etc/apt/preferences.d/stabilite
SETUP
