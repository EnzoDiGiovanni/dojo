# Adapter le service d'un paquet

## Contexte

L'agence utilise « Imprimerie », un logiciel installé par un paquet, qui génère les devis en PDF. Son service `imprimerie` (port 8100 du serveur) a trois défauts aux yeux du responsable technique :

- il tourne en root, alors qu'un compte système `imprimerie` existe ;
- il produit des documents au format « Lettre » américain : il faut le format A4, que le logiciel accepte via la variable d'environnement `IMPRIMERIE_FORMAT=A4` ;
- quand il plante, personne ne le relance.

Le paquet est mis à jour régulièrement, et chaque mise à jour réécrit son fichier d'unit.

## Objectif

Corrige ces trois défauts de façon durable.

## Contraintes

- Ne modifie pas `/usr/lib/systemd/system/imprimerie.service` ni `/usr/bin/imprimerie`.
- Ne crée pas de copie complète de l'unit dans `/etc/systemd/system/`.

## Critères de réussite

- `imprimerie` tourne avec le compte `imprimerie` et produit du A4
- Si le processus est tué brutalement, il redémarre
- Le fichier d'unit du paquet est intact, et aucune copie complète ne le remplace
- Les réglages survivent à une mise à jour du paquet qui réécrit son fichier d'unit

## Comment tester

`curl http://127.0.0.1:8100/` sur le serveur affiche format et utilisateur. Pour le dernier critère, la vérification simule une mise à jour du paquet, puis remet le fichier d'origine.
