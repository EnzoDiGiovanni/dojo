set -e
d=/srv/donnees
mkdir -p $d/clients $d/tmp $d/rapports /root/.dojo
for i in 1 2 3 4; do python3 -c "import random,sys; random.seed($i); sys.stdout.buffer.write(bytes(random.getrandbits(8) for _ in range(5*1024*1024)))" > $d/clients/base-$i.db; done
(cd $d/clients && sha256sum *.db > /root/.dojo/clients.sha256)
for i in 1 2 3 4 5 6; do head -c 10M /dev/zero > $d/tmp/import-$i.part; done
chown -R www-data:www-data $d/rapports
mkdir -p /run/hebergeur && touch /run/hebergeur/premier-rapport $d/.prepare && chown -R www-data /run/hebergeur
