# Les accès de l'équipe

## Contexte

Le serveur de La Fabrique (SSH sur le port **47554** de ta machine) va être ouvert à l'équipe. Aujourd'hui :

- `deploy` accepte deux clés : celle de la CI (commentaire `deploy@poste`) et celle d'un ancien prestataire (`ancien@poste`), dont le contrat est terminé ;
- `nina` (support) a une clé installée, mais elle n'a plus rien à faire en SSH sur ce serveur ;
- lea et hugo, développeurs, n'ont pas encore de compte. Leurs clés publiques sont dans le dossier `equipe/`.

## Objectif

1. Crée les comptes `lea` et `hugo` (dossier personnel, shell bash) et autorise chacun avec sa clé.
2. Révoque la clé de l'ancien prestataire sur `deploy`, sans toucher à celle de la CI.
3. Fais en sorte que seuls les membres d'un groupe `ssh-acces` puissent se connecter en SSH : lea, hugo, deploy, et toi (`ubuntu`).

## Contraintes

- Ne supprime pas le compte `nina` et ne touche pas à ses fichiers : elle garde son compte pour d'autres usages.
- Tes réglages de sshd vont dans `/etc/ssh/sshd_config.d/`.

## Critères de réussite

- `lea` et `hugo` se connectent en SSH avec leur clé
- `nina` ne peut plus se connecter en SSH, bien que sa clé soit toujours installée
- `deploy` se connecte toujours avec la clé de la CI, mais plus avec celle de l'ancien prestataire
- Seuls les membres de `ssh-acces` peuvent se connecter, et `ubuntu` en fait partie

## Comment tester

Tu n'as pas les clés privées de tes collègues : regarde les refus dans le journal de sshd, et teste toi-même avec ta propre clé sur le compte `ubuntu`. La vérification, elle, dispose des clés de chacun.
