# Concevoir des exercices et des défis

## Principes communs

- Un exercice d'application travaille une seule notion ; un exercice intermédiaire en combine 2 ou 3 ; un défi mobilise tout le module, voire les précédents.
- Les critères de réussite sont écrits dans la consigne, vérifiables et sans ambiguïté.
- Les exemples des exercices diffèrent de ceux du cours, pour éviter le copier-adapter.
- Prévois au moins un cas limite que l'apprenant doit découvrir seul (liste vide, valeur nulle, accès concurrent, cas d'exception juridique…).
- La validation est toujours un exercice inédit.

## Développement et technique

- **Implémenter à partir de tests** : fournis des tests qui échouent, il écrit le code qui les fait passer.
- **Débogage** : un petit projet fonctionnel en apparence avec 2 à 4 bugs réalistes, de difficulté croissante. Bonnes familles de bugs : off-by-one, mauvaise gestion du null, condition inversée, asynchrone non attendu, mutation d'un objet partagé, requête N+1, erreur de portée, mauvais type, configuration ou environnement erroné. Le symptôme doit être observable (test rouge, mauvaise sortie, erreur) sans indiquer la cause.
- **Refactoring** : un code qui marche mais qui est mal écrit, avec des tests verts qui doivent rester verts.
- **Spécification ouverte** : un besoin métier décrit comme par un client ; il doit poser des questions, choisir une architecture et la justifier.
- **Lecture de code** : « que fait ce code ? que va-t-il afficher ? » avant de l'exécuter.

## Sujets conceptuels (gestion de projet, méthodo, droit, économie…)

- Étude de cas avec une décision à prendre et à justifier.
- Document à analyser et à critiquer (un planning irréaliste, un contrat avec des clauses problématiques…).
- Production : rédiger un livrable réel (cahier des charges, plan de tests, note de synthèse).

## Sujets quantitatifs (maths, finance, data…)

- Problèmes à résoudre en montrant le raisonnement, pas seulement le résultat.
- Erreur à trouver dans un raisonnement ou un calcul fourni.
- Estimation d'ordre de grandeur avant calcul.

## Langues

- Production écrite ou orale guidée par une situation concrète.
- Texte contenant des erreurs à repérer et corriger.
- Reformulation dans un autre registre.

## Quiz

- Mélange les formats : QCM, vrai/faux justifié, question ouverte courte, « que se passe-t-il si… ».
- Les mauvaises options d'un QCM correspondent à de vraies erreurs de raisonnement, pas à des absurdités.
- Une question par message ; pas de réponse donnée, seulement une question de relance en cas d'erreur.
