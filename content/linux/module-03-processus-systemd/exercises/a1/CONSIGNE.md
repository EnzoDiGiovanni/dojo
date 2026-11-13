# Le serveur qui rame

## Contexte

Lundi matin, le serveur de La Fabrique est lent. Ce week-end, plusieurs personnes ont lancé des choses à la main. Le responsable technique te transmet trois constats :

> Quelque chose mange tout le processeur, et personne ne sait quoi. L'export des commandes de Lea doit aller à son terme, mais il ne doit plus gêner le reste. Et l'audit réseau a trouvé un port 9000 ouvert sur Internet : on n'a rien qui doit écouter là.

L'API interne (service `api-interne`, port 8081) doit continuer de fonctionner.

## Objectif

1. Arrête le processus qui consomme tout le processeur.
2. Donne à l'export de Lea la priorité la plus basse utile, **nice 15**, sans l'interrompre.
3. Fais en sorte que plus rien n'écoute sur le port 9000.

## Contraintes

- Ne redémarre pas le serveur, et ne touche pas au service `api-interne`.
- Commence toujours par l'arrêt le plus doux possible.

## Critères de réussite

- Le processus qui consommait tout le processeur est arrêté
- L'export de Lea tourne toujours, sans avoir été relancé, avec une priorité nice de 15
- Plus rien n'écoute sur le port 9000
- L'API interne répond toujours sur le port 8081 du serveur

## Comment tester

`top`, `ps`, `ss`… sur le serveur. Ce serveur est limité à un processeur et demi : tant que le processus fautif tourne, il fait aussi chauffer ta machine.
