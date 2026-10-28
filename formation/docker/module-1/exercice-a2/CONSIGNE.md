# Fouiller un conteneur

## Contexte

Un collègue a lancé un conteneur et a perdu trois informations. Le conteneur tourne encore : il ne faut ni l'arrêter, ni le recréer.

## Mise en place

Depuis ce dossier, lance `sh start.sh`. Il démarre le conteneur `dojo-m1-a2`. Ne lis pas le script pour trouver les réponses : elles sont générées aléatoirement au démarrage, seul le conteneur les connaît.

## Objectif

Crée trois fichiers dans ce dossier :

1. `token.txt` : le contenu du fichier `/srv/dojo/token` qui se trouve **dans** le conteneur ;
2. `code.txt` : le code secret que le conteneur a affiché une seule fois au démarrage (la valeur seule, sans le texte autour) ;
3. `ip.txt` : l'adresse IP du conteneur sur son réseau Docker.

## Contraintes

- Le conteneur doit rester celui lancé par `start.sh` : pas de `docker rm`, pas de `docker restart`.
- Pas de copie à la main depuis un terminal interactif si tu peux l'éviter : essaie de produire chaque fichier avec une seule commande (une redirection `>` fait l'affaire).

## Critères de réussite

- `token.txt` contient le jeton stocké dans `/srv/dojo/token` du conteneur
- `code.txt` contient le code secret affiché une seule fois dans les logs
- `ip.txt` contient l'adresse IP du conteneur

## Comment tester

`cat token.txt code.txt ip.txt`, puis « Vérifier mon travail ».
