# Validation — le serveur du traiteur, côté accès

## Contexte

Le serveur du service traiteur de La Fabrique (SSH sur le port **47557** de ta machine) sort des mains de l'hébergeur. Il accepte tout ce qu'un serveur exposé ne devrait pas accepter.

Pas d'indice ici : c'est toi seul. Une fois les critères remplis, tu devras justifier tes choix.

## Objectif

1. Crée le compte `sami` (cheffe de projet) et autorise sa clé, fournie dans `equipe/sami.pub`.
2. Seuls les membres du groupe `ssh-acces` peuvent se connecter en SSH : `sami` et toi (`ubuntu`). `nina` garde son compte mais n'a plus accès en SSH.
3. Plus aucune authentification par mot de passe, sous aucune forme, pour aucun compte ; root ne se connecte pas.
4. fail2ban protège SSH : **5 échecs en 10 minutes** valent un bannissement de **30 minutes**. Le serveur de supervision de l'agence, **192.0.2.50**, n'est jamais banni.
5. Écris `/home/ubuntu/attaques.txt` : l'adresse qui a le plus souvent échoué à se connecter **en root** hier (`/var/log/auth.log.1`), sur une ligne au format `<nombre d'échecs> <adresse>`.

## Contraintes

- Le serveur a besoin d'Internet pour installer fail2ban.
- Ne modifie ni `/etc/ssh/sshd_config` ni `/etc/fail2ban/jail.conf`.

## Critères de réussite

- `sami` se connecte avec sa clé, et `nina` ne peut pas se connecter bien que sa clé soit installée
- Aucun compte ne se voit proposer d'authentification par mot de passe, et root ne peut pas se connecter
- fail2ban bannit pour 30 minutes une adresse qui échoue 5 fois en 10 minutes, sans jamais bannir 192.0.2.50
- `attaques.txt` donne l'adresse qui a le plus souvent échoué à se connecter en root hier, avec son nombre d'échecs
