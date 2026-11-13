# Un export tous les quarts d'heure

## Contexte

Le logiciel de facturation de La Fabrique récupère les nouveaux clients dans `/var/lib/export`. Le script `/opt/export/export.sh` produit ces fichiers ; il doit tourner à chaque quart d'heure, sous le compte système `export` (jamais root). Le serveur est parfois arrêté pour maintenance : un export manqué doit être rattrapé au redémarrage.

## Objectif

Crée `export.service` et `export.timer` pour que le script soit lancé à **chaque quart d'heure pile** (xx:00, xx:15, xx:30, xx:45), sous le compte `export`, en rattrapant les exécutions manquées.

## Contraintes

- Ne modifie pas `export.sh`.
- Pas de cron : c'est un timer systemd.
- Le dossier `/var/lib/export` ne doit pas devenir accessible en écriture à tout le monde.

## Critères de réussite

- `export.timer` est actif, activé au démarrage, et déclenche l'export à chaque quart d'heure pile
- Lancé par systemd, `export.service` s'exécute avec le compte `export` et se termine avec succès
- L'export produit bien son fichier dans `/var/lib/export`, au nom du compte `export`
- Une exécution manquée pendant que le serveur était arrêté est rattrapée au démarrage

## Comment tester

`sudo systemctl start export.service` lance une exécution tout de suite, `systemctl list-timers` montre la prochaine. La vérification lance elle-même le service.
