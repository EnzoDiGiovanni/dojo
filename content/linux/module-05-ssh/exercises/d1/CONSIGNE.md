# La CI ne passe plus

## Contexte

Depuis hier, les déploiements automatiques de La Fabrique échouent : la CI n'arrive plus à se connecter au compte `deploy` du serveur (SSH sur le port **47556** de ta machine), avec un sec « Permission denied (publickey) ». Plusieurs personnes sont intervenues sur le serveur cette semaine.

Pour couronner le tout, l'audit externe signale que le serveur accepte encore les mots de passe, « alors que c'est désactivé dans `60-durcissement.conf` », assure l'équipe.

La clé de la CI t'est fournie dans `cles/` pour tes essais.

## Objectif

Rétablis l'accès de la CI au compte `deploy`, et fais en sorte que le durcissement soit réel.

## Contraintes

- La politique d'accès reste la même : seuls `ubuntu` et `deploy` peuvent se connecter en SSH, jamais root.
- Ne désactive aucune vérification de sécurité de sshd pour « débloquer ».
- Il y a plusieurs problèmes, et ils se masquent : corrige-les un par un en suivant le journal.

## Critères de réussite

- `deploy` se connecte avec la clé de la CI
- Le serveur ne propose l'authentification par mot de passe à aucun compte
- Seuls `ubuntu` et `deploy` sont autorisés à se connecter, et root ne peut pas se connecter
- sshd vérifie toujours les droits des fichiers des comptes avant d'accepter une clé

## Comment tester

`ssh -i cles/deploy -p 47556 deploy@127.0.0.1` (fais d'abord `chmod 600 cles/deploy`), et dans la console, le journal de sshd.
