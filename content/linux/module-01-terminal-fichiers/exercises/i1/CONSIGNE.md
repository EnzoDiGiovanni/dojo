# Archiver les journaux du mois

## Contexte

`/var/log/vitrine` grossit : chaque jour ajoute ses journaux d'accès et d'erreurs, ceux de l'API sont rangés dans `api/`. La règle de l'agence : à chaque début de mois, les journaux du mois précédent partent dans une archive compressée, puis sont supprimés du serveur.

Le mois à traiter est **octobre 2026**. Les journaux d'un jour portent la date dans leur nom (`…-2026-10-15.log`).

## Objectif

1. Crée `/srv/archive/journaux-2026-10.tar.gz` qui contient tous les journaux d'octobre (ceux de l'API compris) et seulement eux. Dans l'archive, chaque chemin est relatif à `/var/log/vitrine` : on doit y lire `access-2026-10-01.log` et `api/api-2026-10-03.log`.
2. Supprime ensuite les journaux d'octobre de `/var/log/vitrine`. Ceux de novembre restent.

## Contraintes

- Compte `ubuntu`, sans `sudo`.
- Ne supprime rien tant que tu n'as pas vérifié le contenu de ton archive.

## Critères de réussite

- `/srv/archive/journaux-2026-10.tar.gz` est une archive tar compressée lisible
- L'archive contient tous les journaux d'octobre et seulement eux, avec leur chemin relatif à `/var/log/vitrine`
- Le contenu archivé est identique aux journaux d'origine
- Les journaux d'octobre ont disparu de `/var/log/vitrine`, ceux de novembre sont intacts

## Comment tester

`tar -tzf` liste une archive sans l'extraire. Pour comparer un fichier archivé à l'original sans extraire sur place : `tar -xzOf archive chemin` l'écrit sur la sortie standard.
