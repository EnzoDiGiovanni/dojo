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
| 1. Premiers conteneurs | ✅ Je sais expliquer la différence entre une image et un conteneur, et ce que fait réellement `docker run`.<br>✅ Je sais piloter le cycle de vie d'un conteneur (run, ps, stop, kill, rm, --rm) et lire ses logs ou y exécuter une commande.<br>✅ Je sais publier un port et passer une configuration (variables d'environnement, arguments, politique de redémarrage) à un conteneur.<br>✅ Je sais interroger Docker avec `inspect` et `--format` pour obtenir une information précise sur une image ou un conteneur. | ✅ validé |
| 2. Écrire un Dockerfile | 🔄 Je sais écrire un Dockerfile (FROM, WORKDIR, COPY, RUN, ENV, ARG, EXPOSE, CMD) et construire une image taguée.<br>🔄 Je sais ordonner les instructions d'un Dockerfile pour tirer parti du cache de build.<br>🔄 Je sais combiner ENTRYPOINT et CMD, choisir entre forme exec et forme shell, et j'en connais l'impact sur les arguments et les signaux.<br>🔄 Je sais contrôler le contexte de build pour que rien d'indésirable ne finisse dans l'image (.dockerignore). | 🔄 en cours |
| 3. Persister les données | ⏳ Je sais choisir entre volume nommé, bind mount et tmpfs selon le besoin.<br>⏳ Je sais ce qui survit (ou non) à la suppression d'un conteneur, et sauvegarder/restaurer un volume.<br>⏳ Je sais diagnostiquer et résoudre un problème de permissions UID/GID entre l'hôte et le conteneur. | 📝 à rédiger |
| 4. Réseau | ⏳ Je sais expliquer la différence entre le bridge par défaut et un réseau utilisateur.<br>⏳ Je sais faire communiquer des conteneurs par leur nom grâce au DNS intégré.<br>⏳ Je sais distinguer un port exposé d'un port publié, et choisir l'interface d'écoute. | 📝 à rédiger |
| 5. Docker Compose | ⏳ Je sais décrire services, réseaux et volumes dans un fichier compose et piloter la stack.<br>⏳ Je sais gérer la configuration (environment, fichier .env, interpolation) sans fuiter de secrets.<br>⏳ Je sais ordonner le démarrage avec depends_on et des healthchecks.<br>⏳ Je sais gérer des variantes d'environnement avec des fichiers d'override et des profils. | 📝 à rédiger |
| 6. Images optimisées | ⏳ Je sais écrire un build multi-stage qui sépare outillage de build et image finale.<br>⏳ Je sais choisir une image de base (alpine, slim, distroless) et mesurer l'impact sur la taille.<br>⏳ Je sais accélérer les builds avec les cache mounts BuildKit.<br>⏳ Je sais faire tourner l'application avec un utilisateur non-root. | 📝 à rédiger |
| 7. Prêt pour la production | ⏳ Je sais expliquer le rôle du PID 1 et garantir un arrêt propre (signaux, init).<br>⏳ Je sais écrire un healthcheck pertinent et l'exploiter.<br>⏳ Je sais limiter les ressources (mémoire, CPU) et choisir une politique de redémarrage.<br>⏳ Je sais configurer et exploiter les logs d'un conteneur. | 📝 à rédiger |
| 8. Sécurité et distribution | ⏳ Je sais passer des secrets au build et à l'exécution sans les graver dans l'image.<br>⏳ Je sais réduire les privilèges d'un conteneur (capabilities, système de fichiers en lecture seule).<br>⏳ Je sais publier une image sur un registry et la référencer de façon reproductible (tags vs digests).<br>⏳ Je sais scanner une image et interpréter les vulnérabilités remontées. | 📝 à rédiger |

Statuts des compétences : ✅ validée seul · 🟠 réussie seul, explication à défendre · 🟡 fragile (réussie avec aide, à revalider) · 🔄 en cours · ⏳ à venir

## Où on en est

- **Module actuel :** 2 (Écrire un Dockerfile) — étape : intermédiaire (étapes terminées : Cours, Application, Quiz)
- **Prochain exercice :** `formation/docker/module-2/exercice-i2/CONSIGNE.md` — Intermédiaire — Script de démarrage, version et arguments

## Résultats

| Date | Module | Activité | Résultat |
|---|---|---|---|
| 2026-10-20 | 1 | Diagnostic | 1/5 — départ suggéré : module 1 |
| 2026-10-27 | 1 | Questions de compréhension | 1/3 au premier essai |
| 2026-10-27 | 1 | application a1 — Publier un serveur web | réussi (2 vérification(s), 0 indice(s)) |
| 2026-10-27 | 1 | application a2 — Fouiller un conteneur | réussi (3 vérification(s), 0 indice(s)) |
| 2026-10-27 | 1 | application a3 — Cycle de vie | réussi (2 vérification(s), 0 indice(s)) |
| 2026-10-27 | 1 | Quiz | 3/7 au premier essai |
| 2026-10-28 | 1 | intermediaire i1 — Configurer un service | réussi (3 vérification(s), 0 indice(s)) |
| 2026-10-28 | 1 | intermediaire i2 — Une image, deux conteneurs | réussi (5 vérification(s), 0 indice(s)) |
| 2026-10-29 | 1 | defi d1 — La vitrine de la boulangerie | réussi (2 vérification(s), 0 indice(s)) |
| 2026-10-29 | 1 | validation v1 — Validation — un service d'écho | réussi (2 vérification(s), sans aide) |
| 2026-10-29 | 1 | Validation v1 | critères réussis seul, explications à défendre en séance coach |
| 2026-10-30 | 1 | Validation v1 (coach) | explications défendues : compétences validées |
| 2026-10-30 | 2 | Questions de compréhension | 2/3 au premier essai |
| 2026-10-30 | 2 | application a1 — Premier Dockerfile | réussi (1 vérification(s), 0 indice(s)) |
| 2026-10-30 | 2 | application a2 — Faire travailler le cache | réussi (1 vérification(s), 0 indice(s)) |
| 2026-10-30 | 2 | application a3 — Une image qui se comporte comme une commande | réussi (1 vérification(s), 0 indice(s)) |
| 2026-10-30 | 2 | Quiz | 3/7 au premier essai |
| 2026-11-04 | 2 | intermediaire i1 — Ce qui n'a rien à faire dans l'image | réussi (8 vérification(s), 0 indice(s)) |

## Points de vigilance

- M1 compréhension « Que montre `docker ps` (sans -a) juste après cette commande ? » : raté au premier essai (3 essais)
- M1 compréhension « Vrai ou faux : `docker run redis:7-alpine -p 6379:6379` publie le port 6379 sur l'hôte. » : raté au premier essai (4 essais)
- M1 quiz « `docker inspect -f '{{.State.ExitCode}}' svc` affiche 137. Qu'est-ce que ça t'apprend le plus probablement ? » : raté au premier essai (2 essais)
- M1 quiz « Une application enregistre ses données en mémoire et ne les écrit sur disque que lorsqu'elle reçoit SIGTERM. Que se passe-t-il pour ces données avec `docker kill app` ? » : raté au premier essai (2 essais)
- M1 quiz « Tu lances `docker run -d -p 8080:80 httpd:2.4-alpine` sur ton portable, connecté au wifi d'un café. Qui peut joindre ce serveur ? » : raté au premier essai (2 essais)
- M1 quiz « Que se passe-t-il ? » : raté au premier essai (2 essais)
- M2 compréhension « Vrai ou faux : avec `ENTRYPOINT php bin/console` (forme shell), `docker run img cache:clear` exécute `php bin/console cache:clear`. » : raté au premier essai (2 essais)
- M2 quiz « Que renvoie `docker run --rm img sh -c 'echo "[$REV]"'` pour une image construite avec `--build-arg REV=42` ? » : raté au premier essai (2 essais)
- M2 quiz « Qu'exécute `docker run img --dry-run` ? » : raté au premier essai (3 essais)
- M2 quiz « Un conteneur met systématiquement 10 secondes à s'arrêter avec `docker stop` et finit avec le code 137. Quelle est l'explication la plus probable ? » : raté au premier essai (2 essais)
- M2 quiz « Quel ordre minimise le temps de rebuild quand tu modifies souvent le code et rarement les dépendances ? » : raté au premier essai (2 essais)

## Explications à défendre

Aucune pour l'instant.

## Journal des séances

- **2026-10-30** (coach) — Module 1 — explications défendues : compétences validées : Défendu en séance : rôle des options avant/après l'image (Docker vs programme) ; on-failure:3 vs unless-stopped compris après expérimentation (code 0 relancé en boucle avec unless-stopped). Vocabulaire encore approximatif.
- **2026-10-30** (coach) — Séance coach : défense de la validation M1 réussie. Unless-stopped mal compris au départ, clarifié par l'expérience docker ps -a. À surveiller : précision du vocabulaire (arguments transmis au programme, pas exécutés). Prochaine étape : cours du module 2.

## Notes formateur

<!-- Réservé au formateur : bugs volontaires des défis, cas limites attendus. Ne jamais les révéler à l'apprenant. -->

### M1 · d1 — La vitrine de la boulangerie

1. Publication vers le mauvais port conteneur : `-p 127.0.0.1:47110:8080` alors que nginx écoute sur 80. Symptôme : connexion réinitialisée sur 47110.
2. `docker cp` vers `/usr/share/nginx/index.html` au lieu de `/usr/share/nginx/html/index.html`. Symptôme : la page par défaut de nginx s'affiche une fois le bug 1 corrigé.
3. `-e WHOAMI_NAME=api` placé après le nom de l'image : transmis à whoami comme argument. Symptôme : le conteneur API s'arrête aussitôt (code 2), `docker logs` montre « flag provided but not defined: -e ».
4. Script non idempotent : la seconde exécution échoue sur le conflit de nom (`set -e` arrête le script). Correction attendue : supprimer les conteneurs existants en début de script (ex. `docker rm -f … 2>/dev/null || true`).

## Consignes pour le coach

- Ce fichier est régénéré par Dojo : ne l'édite pas. Agis sur la progression depuis la racine du projet `dojo` :
  - `npm run dojo -- explain docker <module> ok|ko "<note>"` après avoir interrogé l'apprenant sur ses justifications (ko = la validation est à refaire).
  - `npm run dojo -- note docker "<texte>"` pour ajouter une entrée au journal (ce qui a été travaillé, remédiation prévue).
- Les exercices sont dans `formation/docker/module-N/exercice-X/` ; leurs critères de réussite sont dans CONSIGNE.md et vérifiés par le site.
- Le contrat du skill coach-formation s'applique : aucune réponse, aucune ligne de code, uniquement des questions socratiques.
