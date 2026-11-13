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
useradd -m -s /bin/bash -c "Léa Martin" lea
printf '#!/bin/sh\n# Vide le cache de la vitrine.\necho "$(date "+%%F %%T") purge du cache : $(id -un), 128 fichiers"\nls /var/cache/vitrine-inexistant 2>&1 | head -n 1 >&2\n' > /usr/local/bin/purge-cache
printf '#!/bin/sh\n# Envoie le rapport hebdomadaire.\necho "rapport envoyé par $(id -un)"\n' > /usr/local/bin/rapport-hebdo
chmod 755 /usr/local/bin/purge-cache /usr/local/bin/rapport-hebdo
mkdir -p /var/log/vitrine
SETUP
