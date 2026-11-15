# Le dépôt d'un éditeur

## Contexte

La Fabrique a acheté une licence de `fabrique-outils` aux Editions Outils. L'éditeur fournit un dépôt APT, disponible sur ton serveur dans `/srv/depot-outils`, sa clé de signature et une notice d'installation, dans `/home/ubuntu/livraisons/`.

Le responsable sécurité a relu la notice : « hors de question d'appliquer ça tel quel ».

## Objectif

Installe `fabrique-outils` depuis le dépôt de l'éditeur, de façon que :

- les paquets de ce dépôt soient vérifiés avec la clé de l'éditeur ;
- cette clé ne puisse servir à rien d'autre qu'à ce dépôt.

## Contraintes

- Ne modifie pas le contenu de `/srv/depot-outils`.
- Pas de `trusted=yes`, pas d'`apt-key`.

## Critères de réussite

- `fabrique-outils` est installé depuis le dépôt de l'éditeur et fonctionne
- Le dépôt est déclaré avec la clé de l'éditeur en `signed-by`, sans désactiver la vérification
- La clé de l'éditeur n'est pas approuvée pour les autres dépôts
- La mise à jour de la liste des paquets de ce dépôt se fait sans erreur ni avertissement

## Comment tester

`sudo apt update`, `apt policy fabrique-outils`, `fabrique-outils`.
