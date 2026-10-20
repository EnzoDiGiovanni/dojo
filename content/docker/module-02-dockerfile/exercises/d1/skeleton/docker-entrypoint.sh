#!/bin/sh
set -e

echo "[dojo-notes] préparation du stockage..."
mkdir -p /tmp/dojo-notes

node server.js
