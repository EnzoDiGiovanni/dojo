# Un script qui se défend

## Contexte

À La Fabrique, chaque nouveau client a son dossier dans `/srv/sites`, toujours organisé de la même façon. L'équipe le crée à la main et se trompe régulièrement. Il lui faut une commande.

## Objectif

Écris `creer-site`, installé dans `/usr/local/bin` pour que tout le monde puisse le lancer par son nom. Lancé avec `creer-site <nom>` :

- `<nom>` doit être fait de lettres minuscules, chiffres et tirets uniquement ;
- il crée `/srv/sites/<nom>/public/` et `/srv/sites/<nom>/logs/`, et une page `public/index.html` qui contient `Site <nom>` ;
- il affiche le chemin du site créé sur la sortie standard, et sort avec le code **0**.

Dans les autres cas :

- mauvais nombre d'arguments ou nom invalide : un message d'usage sur la **sortie d'erreur**, rien sur la sortie standard, code **2** ;
- site déjà existant : un message sur la sortie d'erreur, code **1**, et le site existant n'est pas touché.

## Contraintes

- Bash, avec `set -euo pipefail`.

## Critères de réussite

- Sans argument, avec trop d'arguments ou avec un nom invalide, le script affiche un usage sur la sortie d'erreur et sort avec le code 2
- Avec un nom valide, il crée l'arborescence du site et sa page, affiche le chemin et sort avec le code 0
- Sur un site existant, il sort avec le code 1, un message sur la sortie d'erreur, sans rien modifier
- `creer-site` se lance par son nom, depuis n'importe quel dossier, par tous les utilisateurs

## Comment tester

`creer-site ; echo $?`, `creer-site "Mon site"`, `creer-site ../etc`, `creer-site vitrine`, `creer-site essai`… La vérification lance le script en tant que `ubuntu` depuis `/tmp`, avec ses propres noms.
