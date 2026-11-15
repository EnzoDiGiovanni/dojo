# Ce qui s'est passé au démarrage

## Contexte

Au dernier démarrage du serveur de la boutique de La Fabrique, des clients n'ont pas pu payer pendant quelques secondes. Le directeur technique veut un compte rendu factuel, tiré du journal, avant de contacter la banque.

## Objectif

Enquête dans le journal du démarrage en cours, puis écris `/home/ubuntu/incident.txt` avec exactement ces cinq lignes :

```
service=<nom du service qui s'est arrêté en erreur, sans .service>
echecs=<nombre de fois où il s'est arrêté en erreur>
code=<son code de sortie lors de ces arrêts>
message=<le message d'erreur exact écrit par le programme>
autre=<l'autre service qui a écrit un message de priorité err sans s'arrêter, sans .service>
```

## Contraintes

- Ne redémarre ni le serveur ni les services : les traces de ce démarrage disparaîtraient.
- Chaque valeur doit venir du journal, pas des fichiers du dossier `lab/`.

## Critères de réussite

- `incident.txt` nomme le service qui s'est arrêté en erreur, et le nombre de ses arrêts
- `incident.txt` donne le code de sortie et le message d'erreur exact de ces arrêts
- `incident.txt` nomme l'autre service qui a signalé une erreur sans s'arrêter

## Comment tester

`journalctl -b`, `-p`, `-u`, `-o`… Si tu as redémarré par mégarde, `sh vps.sh reset` rejoue le démarrage.
