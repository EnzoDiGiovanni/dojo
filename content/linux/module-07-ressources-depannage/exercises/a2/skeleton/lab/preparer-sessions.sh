set -e
d=/var/spool/sessions
mkdir -p /root/.dojo
cd $d
: > /root/.dojo/sessions-recentes.txt
i=0
while [ $i -lt 80 ]; do
  f=sess_$(printf '%05d' $i)r; echo '{"panier":[12]}' > $f; touch -d "$((1 + i % 20)) hours ago" $f; echo $f >> /root/.dojo/sessions-recentes.txt; i=$((i + 1))
done
i=0
while echo '{"panier":[]}' 2>/dev/null > sess_$(printf '%05d' $i)a; do
  touch -d "$((2 + i % 9)) days ago" sess_$(printf '%05d' $i)a; i=$((i + 1))
done
chown -R www-data:www-data $d && chmod 0750 $d
