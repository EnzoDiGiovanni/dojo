# Installe l'atelier dans le dossier donné : versions 2.8 à 2.10, la 2.10 en ligne.
set -e
base=$1
mkdir -p "$base/shared/config"
printf '[app]\nnom = atelier\nlangue = fr\n' > "$base/shared/config/app.ini"
printf 'DB_PASSWORD=atelier-2026\nSMTP_HOST=mail.lafabrique.test\n' > "$base/shared/config/.env"
for v in 2.8 2.9 2.10; do
  mkdir -p "$base/releases/$v"
  tar -xzf /home/ubuntu/livraisons/atelier-$v.tar.gz -C "$base/releases/$v" --strip-components=1
  cp -a "$base/shared/config/." "$base/releases/$v/config/"
done
ln -sfn releases/2.10 "$base/current"
