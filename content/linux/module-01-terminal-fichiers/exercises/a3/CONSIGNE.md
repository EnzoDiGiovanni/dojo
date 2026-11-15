# Les meilleurs clients du site

## Contexte

Le responsable commercial de La Fabrique veut savoir quelles adresses IP sollicitent le plus le site vitrine. La question reviendra chaque semaine : il te faut une commande réutilisable, pas une réponse calculée une fois.

Le journal d'accès du site est `/var/log/vitrine/access.log`, au format « combined » (voir le cours).

## Objectif

Écris `/home/ubuntu/outils/top-ips.sh`. Lancé avec `bash ~/outils/top-ips.sh <journal>`, il affiche les **5 adresses** qui ont fait le plus de requêtes dans ce journal, une par ligne, au format `<nombre> <adresse>`, de la plus active à la moins active :

```
387 203.0.113.42
352 198.51.100.7
...
```

## Contraintes

- Le chemin du journal est le premier argument du script : rien ne doit être écrit en dur.
- Une seule ligne de commande suffit (un pipeline) ; tu n'as besoin ni de boucle ni de variable.

## Critères de réussite

- Sur `/var/log/vitrine/access.log`, le script affiche les 5 adresses les plus actives au format `<nombre> <adresse>`, dans l'ordre
- Le script donne le bon résultat sur un autre journal que celui fourni
- Le script fonctionne avec un chemin de journal qui contient des espaces

## Comment tester

`sh vps.sh console`, puis `bash ~/outils/top-ips.sh /var/log/vitrine/access.log`. Pour le dernier critère, copie le journal sous un nom avec des espaces et relance. La vérification génère ses propres journaux.
