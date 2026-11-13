# La sauvegarde de nuit ne tourne pas

## Contexte

Depuis la migration du serveur de la boutique de La Fabrique, `/var/backups/boutique` est vide. Pourtant :

> Quand je lance `sauvegarde-boutique` en root, ça marche nickel, l'archive apparaît. Et la tâche est bien dans `/etc/cron.d/sauvegarde-nuit`, tous les jours à 2 h 30. Je ne comprends pas.
> — l'ancien administrateur

## Objectif

Fais en sorte que la tâche planifiée produise réellement la sauvegarde chaque nuit, avec son journal du jour.

## Contraintes

- Garde l'horaire (2 h 30), le compte (root) et le nom du journal (`/var/log/sauvegarde-boutique-<date>.log`).
- Le script doit continuer à fonctionner quand root le lance à la main.
- Il y a plusieurs problèmes, et le premier cache tous les autres.

## Critères de réussite

- cron prend en compte la tâche, planifiée chaque nuit à 2 h 30 avec le compte root
- Exécutée exactement comme cron le ferait, la tâche crée une archive complète des données de la boutique
- Le journal de la tâche est écrit dans `/var/log/sauvegarde-boutique-<date du jour>.log`
- Le script fonctionne toujours quand root le lance à la main

## Comment tester

N'attends pas 2 h 30 : reproduis l'exécution de cron (voir le cours). La vérification exécute la ligne du fichier exactement comme cron le ferait.
