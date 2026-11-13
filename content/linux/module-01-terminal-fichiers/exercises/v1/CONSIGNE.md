# Validation — le serveur du traiteur

## Contexte

La Fabrique ouvre un service traiteur et te confie son serveur. Pas d'indice ici : c'est toi seul. Une fois les critères remplis, tu devras justifier tes choix.

## Objectif

1. **Mise en ligne** — La version 3.0 du site est livrée dans `/home/ubuntu/livraisons/traiteur-3.0.tar.gz`. Installe-la dans `/srv/traiteur/releases/3.0` (`index.html` directement dans ce dossier), et fais de `/srv/traiteur/current` un lien symbolique vers elle.
2. **Ménage** — Sous `/srv/traiteur/media`, sous-dossiers compris, supprime les **fichiers** dont le nom finit par `.bak` et qui ont été modifiés il y a plus de 30 jours. Rien d'autre ne doit disparaître.
3. **Statistiques** — Le fichier `/srv/traiteur/data/commandes.csv` liste les commandes (`date;client;produit;quantite`, une ligne d'en-tête). Écris `/home/ubuntu/outils/commandes.sh` : lancé avec `bash ~/outils/commandes.sh <fichier>`, il affiche les **3 produits les plus commandés en quantité totale**, une ligne par produit au format `<total> <produit>`, du plus commandé au moins commandé.

## Contraintes

- Compte `ubuntu`, sans `sudo`.
- Ne modifie pas le dossier `lab/`.

## Critères de réussite

- `/srv/traiteur/releases/3.0` contient la version 3.0, fichiers cachés compris, et `/srv/traiteur/current` y mène
- Plus aucun fichier `.bak` de plus de 30 jours sous `/srv/traiteur/media`, et rien d'autre n'a disparu
- Sur `commandes.csv`, `commandes.sh` affiche les 3 produits les plus commandés au format `<total> <produit>`, dans l'ordre
- `commandes.sh` donne un résultat exact sur un autre fichier de commandes, quel que soit son chemin
