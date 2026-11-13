set -e
mk() { mkdir -p "$(dirname "$2")"; printf 'donnees\n' > "$2"; touch -d "$1 days ago" "$2"; }
c=/var/cache/vitrine
mk 12 "$c/sessions/sess_a81f.tmp"
mk 40 "$c/sessions/sess_77c2.tmp"
mk 1 "$c/sessions/sess_e910.tmp"
mk 9 "$c/vignettes/panier 2024.tmp"
mk 3 "$c/vignettes/produit-12.tmp"
mk 20 "$c/vignettes/produit-12.jpg"
mk 30 "$c/rendu-accueil.tmp"
mk 2 "$c/export.tmp/clients.csv"
mk 50 "$c/regles.conf"
touch -d '15 days ago' "$c/export.tmp"
p=/srv/partage
mkdir -p "$p/compta" "$p/photos" /srv/archive
truncate -s 120M "$p/sauvegarde-site.tar"
truncate -s 80M "$p/photos/shooting printemps.zip"
truncate -s 51M "$p/compta/export-2024.csv"
truncate -s 49M "$p/compta/grand-livre.pdf"
truncate -s 10M "$p/presentation.pdf"
printf 'penser aux devis\n' > "$p/notes.txt"
chown -R ubuntu:ubuntu "$c" "$p" /srv/archive
