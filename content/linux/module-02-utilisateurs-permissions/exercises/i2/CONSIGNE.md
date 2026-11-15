# Une arrivée, un départ

## Contexte

Marc, développeur, quitte La Fabrique ce soir. Son travail sur le serveur doit revenir à lea, et l'agence veut garder une copie de son dossier personnel au cas où. Sami, stagiaire, arrive demain pour huit mois : son compte doit correspondre à son UID sur le serveur de fichiers de l'agence.

## Objectif

**Départ de marc**
1. Archive son dossier personnel dans `/srv/archives/marc.tar.gz`, en conservant droits et propriétaires.
2. Tout ce qui lui appartient hors de son dossier personnel revient à `lea`.
3. Supprime son compte et son dossier personnel.

**Arrivée de sami**
- compte `sami` avec l'UID **1500**, un dossier personnel, le shell `/bin/bash`, membre de `devs` ;
- son compte expire le **30 juin 2027** ;
- elle devra choisir son propre mot de passe à sa première connexion.

## Critères de réussite

- `marc` n'existe plus, et son dossier personnel est dans `/srv/archives/marc.tar.gz` avec ses droits d'origine
- Plus aucun fichier du serveur n'appartient à un utilisateur inexistant, et les anciens fichiers de `marc` appartiennent à `lea`
- `sami` existe avec l'UID 1500, un dossier personnel et le shell bash, et elle est membre de `devs`
- Le compte de `sami` expire le 30 juin 2027, et son mot de passe devra être changé à la première connexion

## Comment tester

`find / -xdev -user marc` (tant qu'il existe), `find / -xdev -nouser`, `tar -tzvf`, `id sami`, `sudo chage -l sami`.
