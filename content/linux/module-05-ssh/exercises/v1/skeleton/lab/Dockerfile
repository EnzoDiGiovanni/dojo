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

COPY authlog.py nina.pub /tmp/lab/
RUN <<'SETUP'
set -e
rm -f /usr/sbin/policy-rc.d
python3 /tmp/lab/authlog.py && chown syslog:adm /var/log/auth.log.1 && chmod 640 /var/log/auth.log.1
useradd -m -s /bin/bash -c "Nina Lopez" nina && echo 'nina:Support-2026!' | chpasswd
install -d -m 700 -o nina -g nina /home/nina/.ssh
install -m 600 -o nina -g nina /tmp/lab/nina.pub /home/nina/.ssh/authorized_keys
echo 'root:Racine-2019!' | chpasswd
printf 'PasswordAuthentication yes\nKbdInteractiveAuthentication yes\n' > /etc/ssh/sshd_config.d/50-cloud-init.conf
rm -rf /tmp/lab
SETUP
