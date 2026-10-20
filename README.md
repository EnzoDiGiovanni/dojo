# Dojo

Plateforme de formation locale qui applique le contrat du skill `coach-formation` : cours, exercices réels
sur ta machine, quiz, défis, validation — **sans jamais te donner la réponse**. Premier sujet : Docker.

## Démarrer

```bash
nvm use        # Node 22
npm install
npm run dev    # http://127.0.0.1:5173
```

Prérequis : Docker qui tourne et `docker ps` utilisable sans `sudo`. Le serveur n'écoute que sur 127.0.0.1 :
il exécute des commandes `docker` pour vérifier ton travail.

`npm start` construit le front et sert tout sur http://127.0.0.1:4317.

## Comment ça marche

1. **Diagnostic** : objectif, rythme, questions de positionnement sans correction → module de départ.
2. **Chaque module** suit le cycle cours → application → quiz → intermédiaire → défi → validation.
   Une étape se débloque quand la précédente est réussie.
3. **Exercices** : « Commencer » crée `formation/<sujet>/module-N/exercice-X/` (consigne + squelette).
   Tu travailles dans ton terminal et ton éditeur ; « Vérifier » contrôle l'état réel de Docker.
4. **Bloqué ?** Des questions, jamais des réponses. Chaque question se débloque après une nouvelle
   tentative et une description de ce que tu as essayé.
5. **Relais Claude Code** : le site tient `formation/<sujet>/progression.md` à jour. Lance `claude` à la
   racine de ce projet et demande à reprendre ta formation : le skill `coach-formation` lit ce fichier,
   t'interroge quand tu as épuisé les indices, et te fait défendre tes justifications de validation.

## Commandes du coach

```bash
npm run dojo -- explain docker 1 ok "note"   # justifications défendues : compétences validées
npm run dojo -- explain docker 1 ko "note"   # explications insuffisantes : validation à refaire
npm run dojo -- note docker "texte"          # entrée de journal
```

## Honnêteté

Le contenu (`content/`) contient les bonnes réponses des quiz et les bugs des défis, mais aucune solution
d'exercice. L'ouvrir pendant ta formation, c'est te voler l'apprentissage.

## Tests

```bash
npm test         # moteur pédagogique, API, et lint du contenu (règles du contrat)
npm run typecheck
```
