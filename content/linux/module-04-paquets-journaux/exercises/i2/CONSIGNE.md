# Un journal qui survit aux redémarrages

## Contexte

Le serveur a redémarré cette nuit après une coupure, et personne n'a pu comprendre pourquoi : le journal du démarrage précédent avait disparu. Sur ce serveur, l'image de l'hébergeur règle journald pour garder le journal en mémoire (regarde `/etc/systemd/journald.conf`).

Le responsable technique veut un journal conservé sur disque, mais pas au risque de remplir le disque.

## Objectif

Configure journald pour que :

- le journal soit conservé sur disque, d'un démarrage à l'autre ;
- il n'occupe jamais plus de **200 Mo** ;
- les entrées de plus de **30 jours** soient supprimées.

## Contraintes

- Ne modifie pas `/etc/systemd/journald.conf` : tes réglages vivent dans un fichier de surcharge.

## Critères de réussite

- La configuration de journald est faite par un fichier de surcharge, `journald.conf` est intact
- Le journal ne peut pas occuper plus de 200 Mo sur le disque
- Les entrées de plus de 30 jours sont supprimées
- Après un redémarrage du serveur, les messages du démarrage précédent sont consultables

## Comment tester

`systemd-analyze cat-config systemd/journald.conf` montre la configuration effective. `sudo reboot` redémarre le serveur.

Particularité du labo : ton serveur partage le noyau de ta machine, donc tous ses démarrages portent le même identifiant, et `journalctl -b -1` ne fonctionne pas comme sur un vrai VPS. Pour vérifier, écris un repère avant de redémarrer (`logger -t essai bonjour`) et cherche-le après (`journalctl -t essai`). La vérification fait de même, et redémarre ton serveur.
