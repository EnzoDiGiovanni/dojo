# La sauvegarde des sites

## Contexte

Les sites des clients de La Fabrique vivent dans `/srv/sites`. Aucune sauvegarde fiable n'existe : trois vieilles archives traînent dans `/var/backups/sites`. Le responsable technique veut une sauvegarde nocturne qu'on n'a pas besoin de surveiller.

## Objectif

Écris `/usr/local/sbin/sauvegarde-sites` (lancé par root) qui :

1. archive tout `/srv/sites` dans `/var/backups/sites/sites-AAAAMMJJ-HHMMSS.tar.gz` (date et heure de l'exécution) ;
2. ne garde que les **7** archives les plus récentes ;
3. s'arrête aussitôt, avec un code non nul, si une autre exécution est en cours : il prend pour cela un verrou sur `/run/lock/sauvegarde-sites.lock` ;
4. en cas d'échec, sort avec un code non nul sans laisser d'archive incomplète ;
5. journalise chaque sauvegarde réussie avec l'étiquette `sauvegarde-sites`, en citant le nom de l'archive.

Puis planifie-le chaque nuit à **2 h 30**, en root, dans `/etc/cron.d/sauvegarde`.

## Contraintes

- Bash, avec `set -euo pipefail`.

## Critères de réussite

- Chaque exécution crée une archive complète et datée de `/srv/sites` dans `/var/backups/sites`
- Seules les 7 archives les plus récentes sont conservées
- Si une sauvegarde est déjà en cours, une nouvelle exécution s'arrête aussitôt avec un code non nul, sans créer d'archive
- En cas d'échec, le script sort avec un code non nul et ne laisse aucune archive incomplète
- Chaque sauvegarde réussie est journalisée, et la tâche est planifiée chaque nuit à 2 h 30 en root

## Comment tester

La vérification lance ton script plusieurs fois de suite, tient elle-même le verrou, et rend `/srv/sites` momentanément introuvable pour provoquer un échec (elle le remet en place ensuite).
