# Ceux qui frappent à la porte

## Contexte

Le serveur de La Fabrique (SSH sur le port **47555** de ta machine) est exposé sur Internet. Le journal d'authentification d'hier, `/var/log/auth.log.1`, montre des milliers de tentatives. Le responsable sécurité veut deux choses : un état des lieux chiffré, et une protection automatique.

Le bureau de l'agence sort sur Internet avec les adresses `198.51.100.0/24` : elles ne doivent **jamais** être bannies.

## Objectif

1. Écris `/home/ubuntu/attaques.txt` : les **3 adresses** qui ont le plus souvent échoué à s'authentifier hier, une par ligne, au format `<nombre d'échecs> <adresse>`, de la plus active à la moins active. Un échec, c'est une tentative refusée, comptée une seule fois.
2. Installe **fail2ban** et configure la prison `sshd` : bannissement d'**une heure** après **3 échecs** en **10 minutes**, jamais pour les adresses du bureau.

## Contraintes

- Le serveur a besoin d'Internet pour installer fail2ban.
- Ne modifie pas `/etc/fail2ban/jail.conf`.

## Critères de réussite

- `attaques.txt` donne les 3 adresses qui ont échoué le plus souvent hier, avec leur nombre d'échecs
- fail2ban surveille SSH : 3 échecs en 10 minutes valent un bannissement d'une heure
- Les adresses du bureau ne sont jamais bannies
- Après plusieurs échecs de connexion, l'adresse fautive est réellement bannie

## Comment tester

Pour le dernier critère, la vérification échoue volontairement plusieurs connexions depuis ta machine, constate le bannissement, puis lève ce bannissement. Ta machine est vue par le serveur avec l'adresse de la passerelle Docker : ne l'ajoute pas aux adresses ignorées.
