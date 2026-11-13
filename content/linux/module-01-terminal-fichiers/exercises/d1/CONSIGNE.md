# Le script de déploiement

## Contexte

L'atelier en ligne de La Fabrique est installé dans `/srv/atelier` selon le même principe que la vitrine : une version par dossier dans `releases/`, un lien `current` vers la version en ligne, une configuration commune dans `shared/config/`. Les versions 2.8, 2.9 et 2.10 sont installées, la 2.10 est en ligne.

Le prestataire précédent a laissé `/home/ubuntu/outils/deployer.sh` pour mettre en ligne une nouvelle version. Il « marche », affirme-t-il : il affiche bien « Version … en ligne ». La version 2.11 vient d'être livrée dans `/home/ubuntu/livraisons/`.

## Objectif

1. Corrige `deployer.sh` pour qu'il fasse vraiment ce que ses commentaires annoncent.
2. Mets la version 2.11 en ligne sur `/srv/atelier`, en gardant la 2.10 disponible pour un retour arrière.

## Contraintes

- Garde la structure du script, son usage (`deployer.sh <archive>`) et la variable `ATELIER_DIR`.
- Il y a plusieurs problèmes. Avant de toucher à la production, observe le script sur une copie de l'installation.
- Ne modifie pas le dossier `lab/`.

## Critères de réussite

- Après un déploiement de la 2.11, `current` désigne la version 2.11 et sert son `index.html`
- La version déployée contient toute la configuration partagée, fichiers cachés compris
- Seules les trois versions les plus récentes restent dans `releases/`
- Relancer le script sur la même archive se termine sans erreur et donne le même résultat
- Sur `/srv/atelier`, la 2.11 est en ligne et la 2.10 est intacte pour un retour arrière

## Comment tester

Le script accepte un autre dossier d'installation : `ATELIER_DIR=/tmp/essai ~/outils/deployer.sh …` sur une copie (`cp -a /srv/atelier /tmp/essai`). La vérification fait de même : elle déploie la 2.11 sur une installation neuve, puis regarde `/srv/atelier`.
