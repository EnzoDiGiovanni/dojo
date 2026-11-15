mkdir -p /var/lib/hebergeur /root/.dojo
setpriv --reuid=hugo --regid=hugo --init-groups setsid -f /opt/stats/calcul-stats </dev/null >/dev/null 2>&1
setpriv --reuid=lea --regid=lea --init-groups setsid -f /opt/export/export-nuit </dev/null >/dev/null 2>&1
setsid -f /usr/bin/python3 /opt/legacy/sauvegarde-legacy.py </dev/null >/dev/null 2>&1
sleep 1
pgrep -f '^/bin/bash /opt/export/export-nuit' > /root/.dojo/export.pid
touch /var/lib/hebergeur/demarre
