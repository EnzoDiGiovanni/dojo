# Bugs volontaires

1. `/srv/clients/agence-roux` en `2760` : le groupe a `rw-` sans `x`. Symptôme : hugo voit les noms avec `ls` (avec des erreurs), mais ne peut ni entrer ni créer. Correction : `g+x`.
2. `/etc/profile.d/zz-durcissement.sh` impose `umask 077` à toutes les connexions : tout fichier créé naît en `600`, le groupe ne peut pas le modifier. Correction attendue : `umask 007` (garde la protection contre les autres, ce que l'audit voulait) plutôt que supprimer le fichier. Discuter : ce fichier s'applique à tout le monde, pas seulement à l'équipe.
3. `/srv/clients/boulangerie-mas` en `0770` sans setgid : ce que crée hugo appartient au groupe `hugo`. Même avec le bon umask, lea ne peut pas le modifier. Correction : `g+s` sur le dossier (et `chgrp` sur ce qui aurait été créé entre-temps).
4. `outils/publier.sh` appartient à l'UID 1007 (ancien compte supprimé) en `744` : seul le « propriétaire » fantôme l'exécute. Correction : `chown lea` (ou un autre membre) et `g+x`. Le critère « aucun fichier orphelin » oblige à traiter la propriété, pas seulement le droit.
5. `/srv/clients` (et `contrats/`, fichiers en `644`) est en `2775` : nina, hors du groupe, traverse et lit les contrats. Correction minimale : `o-rwx` sur `/srv/clients` ; plus propre : `o-rwx` récursif.

Pièges de diagnostic : les bugs 2 et 3 produisent le même symptôme (« hugo ne peut pas modifier le fichier de lea »). Il faut regarder groupe et droits du fichier créé pour les distinguer.
