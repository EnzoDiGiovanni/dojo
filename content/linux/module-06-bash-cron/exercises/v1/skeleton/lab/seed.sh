set -e
mk() { printf 'id;montant\n1;%s\n' "$RANDOM" > "/srv/exports/$2"; touch -d "$1 days ago" "/srv/exports/$2"; }
mk 95 ventes-aout.csv
mk 64 ventes-septembre.csv
mk 33 ventes-octobre.csv
mk 2 ventes-novembre.csv
chown -R exports:exports /srv/exports
