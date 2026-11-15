# Une sonde pour la supervision

## Contexte

L'outil de supervision de La Fabrique sait exécuter des « sondes » : de petits programmes qui affichent un état et le traduisent par leur code de sortie, selon la convention **0 = OK, 1 = ATTENTION, 2 = CRITIQUE, 3 = INCONNU**. Il manque une sonde de remplissage des disques.

## Objectif

Écris `/usr/local/bin/verifier-disque`, lancé ainsi :

```
verifier-disque <seuil_attention> <seuil_critique> [point_de_montage ...]
```

- Les seuils sont des pourcentages entiers. Sans point de montage, la sonde vérifie `/`.
- Pour chaque point de montage, elle affiche une ligne `ETAT <point de montage> <utilisation>%`, où ETAT vaut `CRITIQUE` si l'utilisation atteint ou dépasse le seuil critique, sinon `ATTENTION` si elle atteint ou dépasse le seuil d'attention, sinon `OK`. L'utilisation est celle qu'affiche `df -P`.
- Elle sort avec le code de l'état **le plus grave** rencontré.
- Seuils absents ou non numériques, ou point de montage inexistant : une ligne `INCONNU …` et le code **3**.

## Contraintes

- Bash, avec une fonction qui vérifie un point de montage et renvoie son code.

## Critères de réussite

- Avec des seuils non atteints, la sonde affiche `OK` pour le point de montage et sort avec le code 0
- Au-delà du seuil d'attention, elle affiche `ATTENTION` et sort avec le code 1 ; au-delà du seuil critique, `CRITIQUE` et le code 2
- Avec plusieurs points de montage, elle les vérifie tous et sort avec le code le plus grave
- Avec des seuils invalides ou un point de montage inexistant, elle affiche `INCONNU` et sort avec le code 3

## Comment tester

`df -P /` puis, par exemple, `verifier-disque 95 99 ; echo $?`. La vérification calcule l'utilisation réelle de tes partitions et choisit ses seuils pour provoquer chaque état.
