# Le dossier des clients

## Contexte

`/srv/clients` contient un dossier par client de l'agence, un dossier `contrats/` et un script de publication dans `outils/`. Lea et Hugo, membres du groupe `web`, y travaillent ensemble. Nina, au support, n'est pas dans le groupe. « Ça marchait avant », dit l'équipe. Les plaintes de la semaine :

> **Hugo** : je ne peux même plus entrer dans le dossier de l'Agence Roux.
> **Lea** : les fichiers que crée Hugo, je ne peux pas les modifier. Et lui non plus pour les miens.
> **Hugo** : `publier.sh` me répond « Permission denied ».
> **Le directeur** : Nina m'a cité le montant du contrat Roux. Comment le connaît-elle ?

## Objectif

Remets le dossier en état : chacun doit pouvoir faire son travail, et seulement son travail.

## Contraintes

- N'ajoute ni ne retire personne d'un groupe.
- Pas de `chmod -R 777`, ni de `777` où que ce soit.
- La note de l'audit de sécurité de 2025 est toujours valable : ce qu'un utilisateur crée ne doit jamais être lisible par les utilisateurs hors de son groupe.
- Il y a plusieurs problèmes, certains se ressemblent. Reproduis chaque plainte avant de corriger.

## Critères de réussite

- `lea` et `hugo` peuvent entrer dans chaque dossier client et y créer des fichiers
- Dans chaque dossier client, un fichier créé par `lea` est modifiable par `hugo`, et inversement
- Un fichier créé par `lea` ou `hugo` n'est pas lisible par les utilisateurs hors de son groupe
- `lea` et `hugo` peuvent lancer `/srv/clients/outils/publier.sh`
- `nina` ne peut rien lire sous `/srv/clients`
- Plus aucun fichier de `/srv/clients` n'appartient à un utilisateur inexistant

## Comment tester

`sudo -iu hugo`, `sudo -iu lea`, `sudo -iu nina` : une session neuve à chaque fois, comme une vraie connexion.
