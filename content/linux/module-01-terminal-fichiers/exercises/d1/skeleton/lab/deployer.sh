#!/bin/bash
# Déploie une version de l'atelier.
#   usage : deployer.sh <archive atelier-X.Y.tar.gz>
# Le dossier d'installation est /srv/atelier, ou celui donné par la variable ATELIER_DIR.
set -e

BASE=${ATELIER_DIR:-/srv/atelier}
archive=$1
version=$(basename "$archive" .tar.gz)
version=${version#atelier-}
dest="$BASE/releases/$version"

echo "Déploiement de la version $version dans $BASE"

# 1. Nouvelle version dans son propre dossier
mkdir -p "$dest"
tar -xzf "$archive" -C "$dest"

# 2. Configuration partagée entre les versions
mkdir -p "$dest/config"
cp "$BASE"/shared/config/* "$dest/config/"

# 3. Bascule de la version en ligne
cd "$BASE"
ln -sf "releases/$version" current

# 4. On ne garde que les trois versions les plus récentes
for old in $(ls releases | sort | head -n -3); do
  rm -rf "releases/$old"
done

echo "Version $version en ligne."
