# Bugs volontaires

1. `fabrique-agent` (installé avec `dpkg -i`) est à moitié configuré : son script `postinst` exige `/etc/fabrique-agent/agent.conf`, absent. Symptôme : chaque `apt install` se termine par « Sub-process /usr/bin/dpkg returned an error code (1) » en tentant de configurer l'agent ; `dpkg --audit` le signale. `apt --fix-broken install` et `dpkg --configure -a` échouent tant que la cause n'est pas traitée. Correction : lire le message du postinst, créer `agent.conf` avec `serveur=metriques.lafabrique.test` (indiqué dans le LISEZMOI du paquet), puis `dpkg --configure -a`.
2. Faute de frappe dans `/etc/apt/sources.list.d/ubuntu.sources` : `noble-updtes`. Symptôme : `apt update` → « Err … noble-updtes Release 404 Not Found » / « does not have a Release file ». Correction : `noble-updates`. Ne pas supprimer le fichier : il porte aussi `noble-security` (dernier critère).
3. `/etc/apt/sources.list.d/ancien-miroir.list` redéclare `noble main universe`. Symptôme : « W: Target Packages (main/binary-amd64/Packages) is configured multiple times ». Correction : supprimer ce fichier.
4. `/etc/apt/preferences.d/stabilite` interdit `libjq1` (Pin-Priority -1). Symptôme : `apt install jq` → « jq : Depends: libjq1 (= …) but it is not installable », « held broken packages », alors que `apt-mark showhold` est vide. Piste : `apt policy libjq1` montre la priorité -1 et la candidate « (none) ». Correction : retirer la préférence (en discuter : pourquoi ce gel avait-il été posé ?).

Ordre de découverte habituel : 2 et 3 au premier `apt update`, puis 4 et 1 à l'installation de jq.
