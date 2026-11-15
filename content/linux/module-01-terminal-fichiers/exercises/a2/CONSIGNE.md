# Faire le ménage avec find

## Contexte

Le disque du serveur de La Fabrique se remplit. Deux coupables : le cache du site, où les fichiers temporaires ne sont jamais purgés, et le partage de fichiers de l'équipe, où traînent de très gros fichiers.

## Objectif

1. Sous `/var/cache/vitrine` (sous-dossiers compris), supprime les **fichiers** `.tmp` modifiés il y a **plus de 7 jours**. Tout le reste du cache doit être conservé.
2. Déplace dans `/srv/archive` les fichiers de `/srv/partage` (sous-dossiers compris) qui font **plus de 50 Mo**, en gardant leur nom. Les autres fichiers ne bougent pas.

## Contraintes

- Travaille avec le compte `ubuntu`, sans `sudo`.
- Utilise `find` : une liste de fichiers tapée à la main ne passerait pas à l'échelle sur un vrai serveur.

## Critères de réussite

- Plus aucun fichier `.tmp` de plus de 7 jours sous `/var/cache/vitrine`
- Les fichiers `.tmp` récents et les fichiers d'autres extensions du cache sont toujours là
- Les fichiers de plus de 50 Mo de `/srv/partage` sont dans `/srv/archive`, avec leur nom d'origine
- Les autres fichiers de `/srv/partage` n'ont pas bougé

## Comment tester

`sh vps.sh`, puis `sh vps.sh console`. Regarde d'abord : `find /var/cache/vitrine -ls` et `find /srv/partage -ls` montrent dates et tailles. Si tu supprimes trop, `sh vps.sh reset` te rend un serveur neuf.
