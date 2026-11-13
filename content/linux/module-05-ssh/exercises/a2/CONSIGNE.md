# Un raccourci et des transferts

## Contexte

Tu vas te connecter au serveur de La Fabrique (port **47552** de ta machine) plusieurs fois par jour. Taper `ssh -i … -p 47552 deploy@127.0.0.1` à chaque fois est source d'erreurs. Le compte `deploy` a encore un mot de passe : `Deploy-2026!`.

## Objectif

1. Crée une paire de clés ed25519 dans `cles/` (`cles/id_ed25519`).
2. Écris `ssh_config` (dans ce dossier) pour qu'un hôte nommé `fabrique` désigne le compte `deploy` sur `127.0.0.1`, port 47552, avec ta clé de `cles/`, et **uniquement** elle.
3. Installe ta clé publique sur le compte `deploy` **sans console**, en t'appuyant sur ton fichier de configuration.
4. Envoie `rapport-2026.pdf` (de ce dossier) dans `/srv/echange/` sur le serveur.
5. Rapatrie `/srv/echange/export-clients.csv` du serveur dans ce dossier.

## Contraintes

- N'utilise pas la console du serveur.
- Toutes tes commandes passent par l'hôte `fabrique` de ton `ssh_config` (`ssh -F ssh_config fabrique`, `scp -F ssh_config …`).

## Critères de réussite

- `ssh_config` décrit l'hôte `fabrique` : compte `deploy`, adresse 127.0.0.1, port 47552, ta clé de `cles/` et seulement elle
- Ta clé publique est autorisée pour `deploy`
- `rapport-2026.pdf` est sur le serveur dans `/srv/echange/`, identique à l'original
- `export-clients.csv` est dans ce dossier, identique à celui du serveur

## Comment tester

`ssh -G -F ssh_config fabrique` affiche la configuration qui serait utilisée. `sha256sum` compare deux fichiers, d'un côté et de l'autre.
