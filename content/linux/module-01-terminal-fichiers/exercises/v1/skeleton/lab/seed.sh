set -e
mk() { mkdir -p "$(dirname "$2")"; printf 'media\n' > "$2"; touch -d "$1 days ago" "$2"; }
m=/srv/traiteur/media
mk 45 "$m/menus/menu-noel.pdf.bak"
mk 90 "$m/photos/buffet mariage.jpg.bak"
mk 31 "$m/tarifs.bak"
mk 10 "$m/menus/menu-hiver.pdf.bak"
mk 2 "$m/anciens.bak/carte-2025.pdf"
mk 60 "$m/photos/buffet mariage.jpg"
mk 120 "$m/logo.svg"
touch -d '70 days ago' "$m/anciens.bak"
chown -R ubuntu:ubuntu "$m"
