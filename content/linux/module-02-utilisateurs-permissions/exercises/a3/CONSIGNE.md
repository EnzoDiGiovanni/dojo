# Un sudo sur mesure

## Contexte

Nina, qui assure le support de La Fabrique, doit pouvoir réagir quand les tâches planifiées se bloquent : relancer le service `cron` et lire le journal système `/var/log/syslog` pour comprendre ce qui s'est passé. Le responsable technique est formel : « pas question de lui donner les clés du serveur ».

## Objectif

- Nina peut lancer `sudo systemctl restart cron`, sans mot de passe.
- Nina peut lire `/var/log/syslog`, sans sudo.
- Elle ne peut rien faire d'autre en root.

## Contraintes

- Ne modifie pas `/etc/sudoers` : ta règle vit dans son propre fichier sous `/etc/sudoers.d/`.
- Ne donne pas à nina le groupe `sudo`.

## Critères de réussite

- `nina` peut redémarrer le service cron avec sudo, sans mot de passe
- `nina` ne peut rien lancer d'autre en root : ni shell, ni autre service, ni autre action sur cron
- `nina` peut lire `/var/log/syslog` sans sudo
- La règle est dans un fichier de `/etc/sudoers.d/`, la configuration sudo est valide et `/etc/sudoers` n'a pas changé

## Comment tester

`sudo -iu nina` ouvre une session de nina (sur un vrai serveur, elle se connecterait en SSH). Dans sa session : `sudo -l`, `sudo systemctl restart cron`, et toutes les tentatives qui doivent échouer.
