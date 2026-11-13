# Bugs volontaires

1. `/etc/cron.d/sauvegarde-nuit` ne se termine pas par un saut de ligne : cron ignore la ligne entière. Symptôme : rien du tout, aucun « CMD » dans `journalctl -u cron`, aucun journal. `tail -c1 /etc/cron.d/sauvegarde-nuit | od -c` ou `cat -A` le montrent. Correction : ajouter le saut de ligne.
2. `%` non échappé dans `$(date +%F)` : cron coupe la commande au `%`. Symptôme (une fois le 1 corrigé, en lançant la tâche comme cron) : erreur de syntaxe du shell (« Syntax error: end of file unexpected » ou « unterminated quoted string » selon la forme). Correction : `\%F`.
3. `sauvegarde-boutique` est dans `/usr/local/sbin`, hors du `PATH` de cron (`/usr/bin:/bin`). Symptôme dans le journal de la tâche : « sauvegarde-boutique: not found ». Correction : chemin absolu, ou `PATH=` en tête du fichier.
4. Le script dépend de `BOUTIQUE_DIR`, exporté seulement dans `/root/.bashrc` (lu par les shells interactifs). Avec `set -u`, il s'arrête : « BOUTIQUE_DIR: unbound variable ». C'est pour ça qu'il « marche à la main ». Correction attendue : définir la variable dans le fichier cron (`BOUTIQUE_DIR=/srv/boutique/data` en tête) ou une valeur par défaut dans le script (`${BOUTIQUE_DIR:-/srv/boutique/data}`), pas sourcer `.bashrc`.

Démarche visée : reproduire l'exécution « comme cron » (env -i, /bin/sh, PATH réduit), lire `journalctl -u cron`, puis le journal produit par la tâche.
