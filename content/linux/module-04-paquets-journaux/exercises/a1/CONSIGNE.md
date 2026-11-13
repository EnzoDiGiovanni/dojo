# Installer, retenir, purger

## Contexte

Trois demandes de l'équipe de La Fabrique pour le serveur :

> On a besoin de `jq` pour lire les réponses des API, et de `tree` pour la doc. `screen` ne sert plus depuis le départ de Marc, et on ne veut pas que ses réglages ressurgissent si quelqu'un le réinstalle un jour. Enfin, on a validé la version actuelle de `curl` avec le logiciel de facturation : elle ne doit pas bouger lors des mises à jour tant qu'on n'a pas retesté.

## Objectif

Satisfais les trois demandes avec APT.

## Contraintes

- Le serveur a besoin d'Internet pour télécharger les paquets.
- Ne désinstalle pas curl.

## Critères de réussite

- `jq` et `tree` sont installés et fonctionnent
- `screen` est désinstallé, et sa configuration a disparu du serveur
- `curl` est retenu : les mises à jour ne changeront pas sa version

## Comment tester

`dpkg -l jq tree screen curl`, `apt-mark showhold`, `ls /etc/screenrc`.
