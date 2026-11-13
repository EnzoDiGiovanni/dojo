# Le disque est plein

## Contexte

La partition des données de La Fabrique, montée sur `/srv/donnees`, est presque pleine, et les applications commencent à échouer. Ce qu'on sait :

- `clients/` contient les bases de production : on n'y touche **jamais** ;
- `tmp/` contient des imports interrompus : ils peuvent être supprimés ;
- le service `rapport-gen` produit les rapports clients ; un nettoyage nocturne a supprimé un fichier temporaire de rapport, mais « ça n'a rien libéré ».

## Objectif

Ramène l'utilisation de `/srv/donnees` sous **50 %**, sans perte de données de production, et avec le service `rapport-gen` en marche.

## Contraintes

- Ne redémarre pas le serveur : sur ce labo, `/srv/donnees` est un disque en mémoire, il serait reconstruit à l'identique.
- Ne modifie pas le service `rapport-gen`.

## Critères de réussite

- `/srv/donnees` est utilisé à moins de 50 %
- Les données des clients sont intactes
- Le service `rapport-gen` tourne
- Plus aucun fichier supprimé n'occupe d'espace sur `/srv/donnees`

## Comment tester

`df -h /srv/donnees`, `du -xh --max-depth=1 /srv/donnees`, `sudo lsof +L1`.
