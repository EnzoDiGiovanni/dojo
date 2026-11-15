# Fermer les portes de SSH

## Contexte

L'hébergeur a livré le serveur de La Fabrique (SSH sur le port **47553** de ta machine) avec des réglages permissifs : connexions par mot de passe acceptées, root autorisé à se connecter directement. Le journal montre déjà des tentatives depuis Internet. Le compte `deploy` a le mot de passe `Deploy-2026!`.

## Objectif

1. Mets en place une connexion par clé au compte `deploy` (clé dans `cles/`), et teste-la.
2. Configure sshd pour qu'**aucun** compte ne puisse s'authentifier par mot de passe, et que **root** ne puisse pas se connecter, même avec une clé.
3. Vérifie, après ta dernière modification, que `deploy` se connecte toujours avec sa clé.

## Contraintes

- Ne modifie pas `/etc/ssh/sshd_config` : tes réglages vont dans `/etc/ssh/sshd_config.d/`.
- Garde toujours une session ouverte, ou la console, quand tu recharges sshd.

## Critères de réussite

- Le serveur ne propose plus l'authentification par mot de passe, à aucun compte
- `root` ne peut pas se connecter en SSH, même avec une clé
- La configuration est valide, `sshd_config` est intact et tes réglages sont dans `sshd_config.d/`
- Après ta dernière modification de la configuration, `deploy` s'est reconnecté avec sa clé

## Comment tester

`ssh -o PreferredAuthentications=none -p 47553 deploy@127.0.0.1` liste les méthodes proposées. `sudo sshd -T` montre les valeurs effectives.
