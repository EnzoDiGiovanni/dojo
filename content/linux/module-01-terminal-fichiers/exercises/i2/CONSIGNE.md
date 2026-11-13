# Le rapport d'incident

## Contexte

Hier soir, des clients de La Fabrique se sont plaints d'erreurs sur le site. Le directeur technique veut, pour chaque incident, un rapport de trois lignes tiré du journal d'accès. Il a déjà été trompé par des chiffres faux : il veut un outil exact, pas approximatif.

## Objectif

Écris `/home/ubuntu/outils/rapport.sh`. Lancé avec `bash ~/outils/rapport.sh <journal>`, il affiche exactement :

```
requetes: <nombre total de requêtes du journal>
erreurs_5xx: <nombre de réponses dont le code de statut est 5xx>
url_5xx: <chemin le plus touché par les erreurs 5xx, sans ses paramètres>
```

« Sans ses paramètres » : `/panier?id=3` et `/panier?id=8` comptent tous deux pour `/panier`.

## Contraintes

- Le journal est le premier argument du script, n'importe quel chemin doit fonctionner.
- Le format du journal est celui du cours (« combined »).

## Critères de réussite

- Sur le journal fourni, le rapport compte exactement les requêtes et les erreurs 5xx
- Sur le journal fourni, le rapport indique le chemin le plus touché par les erreurs 5xx, sans paramètres
- Le rapport est exact sur un autre journal, quel que soit son chemin

## Comment tester

`bash ~/outils/rapport.sh /var/log/vitrine/access.log`. Avant de faire confiance à un chiffre, vérifie-le d'une autre façon. La vérification génère ses propres journaux.
