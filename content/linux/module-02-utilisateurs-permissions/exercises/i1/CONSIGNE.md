# Le dossier de l'équipe

## Contexte

Lea a démarré le projet vitrine seule, dans `/srv/projets/vitrine`. Hugo la rejoint : tous deux sont dans le groupe `devs`. Aujourd'hui, hugo ne peut même pas ouvrir les fichiers de lea, et ce qu'il créera ne sera pas modifiable par elle. Nina, au support, n'a rien à faire dans ce projet.

L'agence veut aussi un dossier de dépôt, `/srv/projets/depot`, où tout le monde peut laisser un fichier pour les autres.

## Objectif

1. Dans `/srv/projets/vitrine` et tous ses sous-dossiers, existants ou futurs : tout ce qui est créé appartient au groupe `devs`, et chaque membre de `devs` peut modifier les fichiers créés par les autres. Personne d'autre n'y a accès.
2. Crée `/srv/projets/depot` : tous les utilisateurs du serveur peuvent y déposer des fichiers, mais personne ne peut supprimer ou renommer le fichier d'un autre.

## Contraintes

- Pas de `chmod 777` sur le projet, et aucun cron qui « répare » les droits.
- Les fichiers que lea et hugo créent **en dehors** du projet n'ont pas à devenir modifiables par le groupe : ta solution ne doit concerner que les développeurs.

## Critères de réussite

- Un fichier créé par un membre de `devs` dans le projet, même dans un sous-dossier existant, appartient au groupe `devs`
- Un membre de `devs` peut modifier un fichier créé par un autre membre, y compris les fichiers d'avant ton intervention
- `nina` n'a aucun accès au projet
- Tout le monde peut déposer un fichier dans `/srv/projets/depot`, mais personne ne peut supprimer celui d'un autre

## Comment tester

Joue la scène à plusieurs : `sudo -iu lea`, `sudo -iu hugo`, `sudo -iu nina` ouvrent une session neuve pour chacun. La vérification fait de même.
