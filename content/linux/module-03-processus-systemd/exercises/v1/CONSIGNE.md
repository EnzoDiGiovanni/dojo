# Validation — la facturation

## Contexte

La version 2.0 de la facturation de La Fabrique est livrée dans `/opt/facturation` : `serveur.py` (le service, port 8300) et `relances.py` (l'envoi des relances, une tâche qui se termine). Leur configuration est dans `/etc/facturation/facturation.env`. Le compte système `facturation` existe.

L'ancienne version 1.0 a été lancée à la main par quelqu'un, et elle occupe encore le port.

Pas d'indice ici : c'est toi seul. Une fois les critères remplis, tu devras justifier tes choix.

## Objectif

1. Arrête proprement l'ancienne facturation, sans redémarrer le serveur.
2. Fais tourner `serveur.py` comme service `facturation` : compte `facturation`, configuration lue depuis le fichier d'environnement, relancé s'il meurt, démarré avec le serveur.
3. Planifie `relances.py` chaque jour à **08:00**, sous le compte `facturation`, avec un timer `facturation-relance.timer`.

## Contraintes

- Ne modifie aucun fichier de `/opt/facturation` ni `facturation.env`.
- Lance les programmes avec `/usr/bin/python3`.

## Critères de réussite

- Plus aucun ancien processus n'occupe le port 8300, et c'est `facturation` qui y répond
- `facturation` tourne avec le compte `facturation`, lit sa configuration et se relance s'il est tué
- `facturation-relance.timer` est actif, activé, et déclenche les relances chaque jour à 08:00
- Lancées par systemd, les relances s'exécutent avec le compte `facturation` et réussissent
- Après un redémarrage du serveur, `facturation` répond de nouveau sans intervention
