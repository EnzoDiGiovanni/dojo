# Les droits du dossier comptable

## Contexte

Le dossier `/srv/compta` a été rempli à la va-vite : tout appartient à root et certains fichiers sont modifiables par n'importe qui. Le groupe `compta` regroupe `lea` et `nina`. `hugo`, développeur, ne fait pas partie de la compta.

## Objectif

Pose propriétaires et droits pour obtenir exactement ceci :

| Chemin | Accès |
|---|---|
| `/srv/compta` | les membres de `compta` peuvent y entrer, lister et créer des fichiers ; les autres n'y ont aucun accès |
| `bilan-2025.pdf` | appartient à `lea`, qui peut le modifier ; le groupe `compta` peut seulement le lire ; les autres rien |
| `outils/export.sh` | `lea` et `nina` peuvent le lancer ; seule `lea` (sa propriétaire) peut le modifier |
| `secret/banque.txt` | seul root peut le lire |

## Contraintes

- Ne déplace ni ne renomme aucun fichier.
- N'ajoute personne à un groupe.

## Critères de réussite

- Les membres de `compta` peuvent entrer dans `/srv/compta` et y créer des fichiers, les autres ne peuvent même pas le lister
- `bilan-2025.pdf` est modifiable par `lea` seule, lisible par `nina`, inaccessible à `hugo`
- `export.sh` se lance pour `lea` et `nina`, et seule `lea` peut le modifier
- Seul root peut lire `secret/banque.txt`

## Comment tester

`sudo -u nina cat /srv/compta/bilan-2025.pdf`, `sudo -u hugo ls /srv/compta`… Teste chaque case du tableau, autorisations **et** refus.
