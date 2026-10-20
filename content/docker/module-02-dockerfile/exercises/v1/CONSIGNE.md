# Validation — empaqueter un service Python

## Contexte

Changement de langage : `app.py` est un service HTTP Python. Ses dépendances sont listées dans `requirements.txt` et s'installent avec `pip install -r requirements.txt`. Il accepte des options : `python app.py [--greeting TEXTE] [--port PORT]` (port 8000 par défaut).

Pas d'indice : c'est toi seul. Une fois les critères remplis, tu devras justifier tes choix.

## Objectif

Écris le `Dockerfile` (et tout ce qui va avec) de façon que :

- l'image soit basée sur une image officielle Python 3.13 ;
- un conteneur lancé sans argument réponde sur son port 8000 avec la salutation par défaut (`Bonjour`) ;
- les options passées après le nom de l'image soient transmises à l'application : `docker run … <image> --greeting Salut` répond avec `Salut` ;
- l'image fixe par défaut `APP_ENV=production` ;
- modifier `app.py` ne rejoue pas l'installation des dépendances ;
- l'image ne contienne ni `.env` ni les tests ;
- `docker stop` arrête le conteneur proprement et rapidement.

## Contraintes

- Ne modifie pas `app.py`.
- Ne déplace ni ne supprime aucun fichier du dossier.

## Critères de réussite

- Le Dockerfile se construit et l'image embarque Python 3.13
- Sans argument, le conteneur répond `Bonjour` sur son port 8000
- Avec les arguments `--greeting Salut`, le conteneur répond `Salut`
- L'image définit `APP_ENV=production` par défaut
- Après une modification de `app.py` seul, l'étape `pip install` est servie par le cache
- L'image ne contient ni `.env` ni `test_app.py`
- `docker stop` arrête le conteneur en moins de 3 secondes, avec le code de sortie 0
