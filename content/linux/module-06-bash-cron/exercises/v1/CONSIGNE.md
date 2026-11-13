# Validation — l'archivage des exports

## Contexte

Le logiciel de facturation de La Fabrique dépose chaque mois un export CSV dans `/srv/exports`. Le dossier déborde. Le compte système `exports` est propriétaire de ces fichiers.

Pas d'indice ici : c'est toi seul. Une fois les critères remplis, tu devras justifier tes choix.

## Objectif

1. Écris `/usr/local/bin/archiver-exports`, lancé par le compte `exports` avec `archiver-exports [jours]` (30 par défaut) :
   - il traite le dossier donné par la variable `EXPORTS_DIR`, ou `/srv/exports` si elle n'est pas définie ;
   - chaque fichier `.csv` placé directement dans ce dossier (pas dans ses sous-dossiers) et modifié il y a plus de `jours` jours est compressé avec gzip dans `archives/AAAA-MM/` (le mois de sa date de modification), sous son nom suivi de `.gz`, puis retiré du dossier ;
   - un argument qui n'est pas un nombre entier positif est refusé avec le code **2**, sans rien toucher ;
   - si une autre exécution tient le verrou `/run/lock/archiver-exports.lock`, il s'arrête aussitôt avec un code non nul ;
   - il affiche et journalise (étiquette `archiver-exports`) le nombre de fichiers archivés.
2. Planifie-le **chaque jour à 3 h 15**, avec le compte `exports`, dans `/etc/cron.d/exports`. Sa sortie et ses erreurs s'ajoutent à `/var/log/exports/archiver.log`.

## Critères de réussite

- Les exports de plus de N jours sont compressés dans le dossier de leur mois, sans perte, et les autres fichiers ne bougent pas
- Un argument invalide est refusé avec le code 2, sans rien déplacer
- Pendant qu'une autre exécution tient le verrou, le script s'arrête aussitôt avec un code non nul, sans rien déplacer
- Chaque exécution journalise le nombre de fichiers archivés
- La tâche est planifiée chaque jour à 3 h 15 avec le compte `exports`, et, lancée comme cron le ferait, ajoute sa sortie à `/var/log/exports/archiver.log`
