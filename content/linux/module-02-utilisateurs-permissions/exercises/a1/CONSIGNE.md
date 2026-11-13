# Les comptes de l'équipe

## Contexte

La Fabrique s'agrandit. Le responsable technique t'envoie ce message :

> Hugo Bernard arrive lundi comme développeur. Léa, notre comptable, passe à mi-temps sur le développement : elle reste à la compta. Crée un groupe `devs` pour les développeurs. Il nous faut aussi un compte `vitrine` pour faire tourner le site, pas pour que quelqu'un s'y connecte. Enfin, le stage est terminé : coupe l'accès du compte `stagiaire`, mais garde ses fichiers, on n'a pas encore récupéré son rapport.

## Objectif

Sur le serveur, en tant que `ubuntu` avec `sudo` :

- crée le compte `hugo`, avec son dossier personnel, le shell `/bin/bash` et son nom complet ;
- crée le groupe `devs`, avec `hugo` et `lea` comme membres ;
- crée le compte système `vitrine`, sans shell de connexion ;
- verrouille le mot de passe de `stagiaire`.

## Critères de réussite

- `hugo` existe avec un dossier personnel, le shell `/bin/bash` et le nom complet « Hugo Bernard »
- `hugo` et `lea` sont membres de `devs`, et `lea` est toujours membre de `compta`
- `vitrine` est un compte système (UID inférieur à 1000) sans shell de connexion
- Le mot de passe de `stagiaire` est verrouillé, et son dossier personnel est intact

## Comment tester

`getent passwd hugo`, `id lea`, `sudo passwd -S stagiaire`. Note pour la suite : un utilisateur déjà connecté ne voit ses nouveaux groupes qu'à sa prochaine connexion.
