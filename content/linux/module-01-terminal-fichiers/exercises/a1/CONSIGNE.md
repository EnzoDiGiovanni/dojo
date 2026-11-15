# Une arborescence de déploiement

## Contexte

La Fabrique, petite agence web, te confie son premier serveur. Le développeur a déposé deux versions du site vitrine dans `/home/ubuntu/livraisons/`, sous forme d'archives. L'agence veut une organisation qui permette de revenir à la version précédente en une seconde : chaque version dans son propre dossier, et un lien `current` qui désigne la version en ligne.

## Objectif

Sur le serveur, organise `/srv/vitrine` ainsi :

```
/srv/vitrine/
├── releases/
│   ├── 1.0/          ← contenu de vitrine-1.0.tar.gz (index.html directement ici)
│   └── 1.1/          ← contenu de vitrine-1.1.tar.gz
├── shared/
│   └── uploads/
└── current → la version 1.1
```

## Contraintes

- Travaille avec le compte `ubuntu`, sans `sudo` : `/srv/vitrine` t'appartient déjà.
- Ne modifie pas les archives livrées.
- Ne modifie pas le dossier `lab/` : c'est la machine de l'hébergeur.

## Critères de réussite

- `releases/1.0` et `releases/1.1` contiennent les fichiers de leur version, `index.html` à la racine
- Les fichiers cachés des archives sont présents dans chaque version
- `/srv/vitrine/current` est un lien symbolique vers la version 1.1
- `/srv/vitrine/shared/uploads` est un dossier
- Les archives livrées sont intactes dans `/home/ubuntu/livraisons`

## Comment tester

`sh vps.sh` démarre ton serveur, `sh vps.sh console` t'y connecte. Sur le serveur, `find /srv/vitrine` affiche tout l'arbre et `cat /srv/vitrine/current/index.html` doit afficher la version 1.1. Puis « Vérifier mon travail ».
