# Progression — Docker

> Généré par Dojo à chaque action dans le site : ne pas éditer à la main.
> Coach Claude Code : lis « Consignes pour le coach » en bas de ce fichier.

**Objectif de l'apprenant :** Devenir meilleur et pourquoi pas postuler en tant que devops
**Niveau de départ :** Débutant : quelques commandes copiées-collées (ressenti) — diagnostic 1/5, module de départ suggéré : 1
**Rythme :** 3 soirs par semaine
**Démarrée le :** 2026-10-20 — **Dernière séance :** —

## Programme

| Module | Compétences (« Je sais… ») | Statut |
|---|---|---|
| 1. Premiers conteneurs | ⏳ Je sais expliquer la différence entre une image et un conteneur, et ce que fait réellement `docker run`.<br>⏳ Je sais piloter le cycle de vie d'un conteneur (run, ps, stop, kill, rm, --rm) et lire ses logs ou y exécuter une commande.<br>⏳ Je sais publier un port et passer une configuration (variables d'environnement, arguments, politique de redémarrage) à un conteneur.<br>⏳ Je sais interroger Docker avec `inspect` et `--format` pour obtenir une information précise sur une image ou un conteneur. | ⏳ à venir (débloqué) |
| 2. Écrire un Dockerfile | ⏳ Je sais écrire un Dockerfile (FROM, WORKDIR, COPY, RUN, ENV, ARG, EXPOSE, CMD) et construire une image taguée.<br>⏳ Je sais ordonner les instructions d'un Dockerfile pour tirer parti du cache de build.<br>⏳ Je sais combiner ENTRYPOINT et CMD, choisir entre forme exec et forme shell, et j'en connais l'impact sur les arguments et les signaux.<br>⏳ Je sais contrôler le contexte de build pour que rien d'indésirable ne finisse dans l'image (.dockerignore). | ⏳ à venir |
| 3. Persister les données | ⏳ Je sais choisir entre volume nommé, bind mount et tmpfs selon le besoin.<br>⏳ Je sais ce qui survit (ou non) à la suppression d'un conteneur, et sauvegarder/restaurer un volume.<br>⏳ Je sais diagnostiquer et résoudre un problème de permissions UID/GID entre l'hôte et le conteneur. | 📝 à rédiger |
| 4. Réseau | ⏳ Je sais expliquer la différence entre le bridge par défaut et un réseau utilisateur.<br>⏳ Je sais faire communiquer des conteneurs par leur nom grâce au DNS intégré.<br>⏳ Je sais distinguer un port exposé d'un port publié, et choisir l'interface d'écoute. | 📝 à rédiger |
| 5. Docker Compose | ⏳ Je sais décrire services, réseaux et volumes dans un fichier compose et piloter la stack.<br>⏳ Je sais gérer la configuration (environment, fichier .env, interpolation) sans fuiter de secrets.<br>⏳ Je sais ordonner le démarrage avec depends_on et des healthchecks.<br>⏳ Je sais gérer des variantes d'environnement avec des fichiers d'override et des profils. | 📝 à rédiger |
| 6. Images optimisées | ⏳ Je sais écrire un build multi-stage qui sépare outillage de build et image finale.<br>⏳ Je sais choisir une image de base (alpine, slim, distroless) et mesurer l'impact sur la taille.<br>⏳ Je sais accélérer les builds avec les cache mounts BuildKit.<br>⏳ Je sais faire tourner l'application avec un utilisateur non-root. | 📝 à rédiger |
| 7. Prêt pour la production | ⏳ Je sais expliquer le rôle du PID 1 et garantir un arrêt propre (signaux, init).<br>⏳ Je sais écrire un healthcheck pertinent et l'exploiter.<br>⏳ Je sais limiter les ressources (mémoire, CPU) et choisir une politique de redémarrage.<br>⏳ Je sais configurer et exploiter les logs d'un conteneur. | 📝 à rédiger |
| 8. Sécurité et distribution | ⏳ Je sais passer des secrets au build et à l'exécution sans les graver dans l'image.<br>⏳ Je sais réduire les privilèges d'un conteneur (capabilities, système de fichiers en lecture seule).<br>⏳ Je sais publier une image sur un registry et la référencer de façon reproductible (tags vs digests).<br>⏳ Je sais scanner une image et interpréter les vulnérabilités remontées. | 📝 à rédiger |

Statuts des compétences : ✅ validée seul · 🟠 réussie seul, explication à défendre · 🟡 fragile (réussie avec aide, à revalider) · 🔄 en cours · ⏳ à venir

## Où on en est

- **Module actuel :** 1 (Premiers conteneurs) — étape : cours (étapes terminées : aucune)
- **Prochain exercice :** Cours — module 1

## Résultats

| Date | Module | Activité | Résultat |
|---|---|---|---|
| 2026-10-20 | 1 | Diagnostic | 1/5 — départ suggéré : module 1 |

## Points de vigilance

- Rien à signaler pour l'instant.

## Explications à défendre

Aucune pour l'instant.

## Journal des séances

- Aucune séance terminée.

## Notes formateur

<!-- Réservé au formateur : bugs volontaires des défis, cas limites attendus. Ne jamais les révéler à l'apprenant. -->

## Consignes pour le coach

- Ce fichier est régénéré par Dojo : ne l'édite pas. Agis sur la progression depuis la racine du projet `dojo` :
  - `npm run dojo -- explain docker <module> ok|ko "<note>"` après avoir interrogé l'apprenant sur ses justifications (ko = la validation est à refaire).
  - `npm run dojo -- note docker "<texte>"` pour ajouter une entrée au journal (ce qui a été travaillé, remédiation prévue).
- Les exercices sont dans `formation/docker/module-N/exercice-X/` ; leurs critères de réussite sont dans CONSIGNE.md et vérifiés par le site.
- Le contrat du skill coach-formation s'applique : aucune réponse, aucune ligne de code, uniquement des questions socratiques.
