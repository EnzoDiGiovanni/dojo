# La vitrine de la boulangerie

## Contexte

La Boulangerie Dojo a fait écrire un script `run.sh` qui démarre sa vitrine : un site statique servi par nginx, et une petite API de démonstration. Le prestataire assure que « ça marche chez lui ». Chez toi, le script se termine sans erreur… et pourtant le site n'est pas là.

Le code de la page (`site/index.html`) est correct. Le problème est ailleurs.

## Objectif

Corrige `run.sh` pour que la vitrine fonctionne comme annoncé :

- le site de la boulangerie s'affiche sur http://127.0.0.1:47110 ;
- l'API répond sur http://127.0.0.1:47111 et s'identifie avec le nom `api` ;
- le script peut être relancé autant de fois qu'on veut, y compris quand la stack tourne déjà.

## Contraintes

- La stack doit être démarrée par `sh run.sh`, lancé depuis ce dossier, pas par des commandes tapées à la main.
- Garde les noms de conteneurs, les images et les ports hôte du script.
- Il y a plusieurs problèmes. Corrige-les un par un et explique-toi à chaque fois ce que tu as observé.

## Critères de réussite

- http://127.0.0.1:47110 sert la page de la boulangerie (contient « Boulangerie Dojo »)
- http://127.0.0.1:47111 répond et affiche `Name: api`
- Les conteneurs `dojo-m1-d1-web` et `dojo-m1-d1-api` sont tous les deux en cours d'exécution
- Relancer `sh run.sh` alors que la stack tourne se termine sans erreur, et les deux services répondent ensuite

## Comment tester

`sh run.sh`, puis `docker ps -a`, `curl`… et « Vérifier mon travail ». Attention : la vérification relance ton script.
