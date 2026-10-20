# Module 2 — Écrire un Dockerfile

## Objectifs

À la fin de ce module, tu sais :

- écrire un Dockerfile et construire une image taguée ;
- ordonner les instructions pour que le cache de build travaille pour toi ;
- choisir entre `CMD` et `ENTRYPOINT`, entre forme *exec* et forme *shell*, en connaissant les conséquences ;
- maîtriser ce qui est envoyé au build, et donc ce qui peut finir dans l'image.

Les exemples de ce cours utilisent une application PHP ; les exercices utilisent d'autres langages. C'est voulu : ce qui compte, c'est le raisonnement, pas la recette.

## 1. Du Dockerfile à l'image

Un Dockerfile est une suite d'instructions exécutées de haut en bas pour produire une image :

```dockerfile
FROM php:8.3-cli-alpine
WORKDIR /srv/app
COPY . .
CMD ["php", "-S", "0.0.0.0:8000", "-t", "public"]
```

```bash
docker build -t catalogue:1.0 .
#            │              └── le CONTEXTE de build : le dossier envoyé au builder
#            └───────────────── nom:tag de l'image produite
```

Les instructions essentielles :

| Instruction | Rôle |
|---|---|
| `FROM image` | image de base ; toujours la première instruction (hors `ARG`) |
| `WORKDIR /chemin` | répertoire courant pour la suite (créé si besoin) ; évite les `cd` et les chemins absolus partout |
| `COPY src dest` | copie des fichiers **du contexte** vers l'image (`ADD` fait pareil avec des effets en plus — archives, URL — à éviter sauf besoin précis) |
| `RUN commande` | exécute une commande **au build** et enregistre le résultat dans une nouvelle couche |
| `ENV CLE=valeur` | variable d'environnement présente au build **et** dans les conteneurs |
| `ARG NOM[=défaut]` | variable disponible **seulement au build**, réglable avec `--build-arg NOM=valeur` |
| `EXPOSE 8000` | documente le port d'écoute ; **ne publie rien** (c'est le rôle de `-p`) |
| `CMD` / `ENTRYPOINT` | ce qui s'exécute **au démarrage d'un conteneur** (voir section 4) |

Distinction fondamentale : `RUN` s'exécute **une fois, pendant le build** ; `CMD`/`ENTRYPOINT` à **chaque démarrage** de conteneur.

Une valeur d'`ARG` ne survit pas dans l'image. Pour la rendre visible à l'application, on la recopie dans un `ENV` :

```dockerfile
ARG RELEASE=dev
ENV APP_RELEASE=$RELEASE
```

## 2. Couches et cache

Chaque instruction qui modifie le système de fichiers (`RUN`, `COPY`, `ADD`) produit une couche. Pour chaque instruction, le builder se demande : « ai-je déjà construit exactement cette étape, à partir exactement de la même étape précédente ? »

- pour `RUN`, il compare le texte de la commande ;
- pour `COPY`/`ADD`, il compare aussi **le contenu des fichiers copiés**.

Si oui : `CACHED`, la couche est réutilisée instantanément. Sinon, l'étape est rejouée — **ainsi que toutes les suivantes**, car elles partent d'une base différente.

Conséquence : on place en haut ce qui change rarement, en bas ce qui change souvent. Comparons :

```dockerfile
# Version A
FROM php:8.3-cli-alpine
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /srv/app
COPY . .
RUN composer install --no-dev
```

```dockerfile
# Version B
FROM php:8.3-cli-alpine
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /srv/app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader
COPY . .
RUN composer dump-autoload --optimize
```

Tu modifies un contrôleur PHP. Dans A, `COPY . .` voit un fichier changé : cache invalidé, et `composer install` (lent, réseau) est rejoué. Dans B, `composer.json` et `composer.lock` n'ont pas bougé : l'installation est servie par le cache, seules les deux dernières étapes sont rejouées.

Pour voir ce qui est servi par le cache : `docker build --progress=plain …` affiche `CACHED` sous chaque étape réutilisée.

Autre piège classique : `RUN apt-get update` seul sur une ligne, puis `RUN apt-get install …` plus bas. La première est mise en cache pour toujours et finit par référencer des index périmés. On les enchaîne dans le même `RUN`.

## 3. Le contexte de build et .dockerignore

Avant d'exécuter la moindre instruction, `docker build` envoie **le contexte** (le dossier passé en argument, souvent `.`) au builder. Ensuite, `COPY . .` copie… tout ce qui a été envoyé.

Sans précaution, tu envoies et copies : le dossier `.git`, les dépendances installées sur ton hôte (`vendor/`, `node_modules/` — compilées pour ton système, pas forcément pour l'image), les logs, et surtout **les fichiers de secrets** comme `.env`. Une fois dans une couche, un secret y reste, même si une instruction suivante le supprime : les couches précédentes sont toujours dans l'image.

Le fichier `.dockerignore`, à la racine du contexte, exclut des chemins avant l'envoi. La syntaxe ressemble à `.gitignore` :

```text
.git
vendor/
var/log/
*.md
!README.md
.env*
```

Bénéfices : builds plus rapides (contexte plus petit, cache moins souvent invalidé par des fichiers sans rapport) et images sans fuite. La taille du contexte apparaît dans la sortie du build (`transferring context: …`).

## 4. CMD, ENTRYPOINT, forme exec, forme shell

Au démarrage d'un conteneur, Docker exécute `ENTRYPOINT` suivi de `CMD`. Les deux s'écrivent sous deux formes :

- **forme exec** (tableau JSON) : `CMD ["php", "-S", "0.0.0.0:8000"]` — le programme est lancé directement, sans shell ;
- **forme shell** (texte) : `CMD php -S 0.0.0.0:8000` — Docker lance en réalité `/bin/sh -c "php -S 0.0.0.0:8000"`.

Ce que deviennent les arguments de `docker run image ARGS…` :

| Dockerfile | `docker run img` exécute | `docker run img a b` exécute |
|---|---|---|
| `CMD ["php", "bin/console"]` | `php bin/console` | `a b` (CMD remplacé) |
| `ENTRYPOINT ["php", "bin/console"]` | `php bin/console` | `php bin/console a b` |
| `ENTRYPOINT ["php", "bin/console"]` + `CMD ["list"]` | `php bin/console list` | `php bin/console a b` |
| `ENTRYPOINT php bin/console` (shell) | `/bin/sh -c "php bin/console"` | idem : **a b sont ignorés** |

Retiens : `ENTRYPOINT` fixe *le programme*, `CMD` fournit *des arguments par défaut* qu'on peut remplacer. `--entrypoint` remplace l'ENTRYPOINT au lancement.

### Les signaux et le PID 1

`docker stop` envoie un signal (SIGTERM par défaut) **au processus de PID 1** du conteneur, attend 10 secondes, puis envoie SIGKILL. Si ton application n'est pas le PID 1, c'est un autre processus qui reçoit le signal — et s'il ne le transmet pas, ton application ne sait jamais qu'on lui demande de s'arrêter : elle est tuée net au bout de 10 secondes, sans fermer ses connexions ni finir ses écritures.

Avec la forme exec, ton programme est le PID 1. Avec la forme shell, c'est `sh` qui démarre ; certains shells remplacent leur processus par la dernière commande (`exec` implicite), d'autres non, et ça dépend de ce que contient la commande. Ne pas compter dessus : **forme exec par défaut**.

Même logique pour les scripts de démarrage, très courants pour préparer l'environnement avant de lancer l'application :

```sh
#!/bin/sh
# docker-entrypoint.sh
set -e
php bin/console cache:warmup
exec "$@"
```

```dockerfile
COPY docker-entrypoint.sh /usr/local/bin/
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["php", "-S", "0.0.0.0:8000", "-t", "public"]
```

`exec` remplace le shell par la commande : elle devient le PID 1 et reçoit les signaux. `"$@"` transmet tous les arguments reçus par le script (ici, le `CMD` ou ce que tu passes à `docker run`), en préservant les espaces. Sans `exec`, le shell reste PID 1 et attend son enfant sans lui transmettre SIGTERM.

Un script doit être exécutable (`chmod +x`, conservé par `COPY`) et commencer par un shebang qui existe dans l'image (`/bin/sh` existe sur alpine, pas `/bin/bash`).

## Pièges courants

- `COPY . .` avant l'installation des dépendances : le cache saute à chaque modification de code.
- Pas de `.dockerignore` : secrets et dépendances de l'hôte dans l'image.
- Croire qu'`EXPOSE` publie un port.
- `ENTRYPOINT` en forme shell : les arguments de `docker run` sont ignorés.
- Script d'entrée sans `exec` : arrêts lents, code de sortie 137.
- Confondre `ARG` (build) et `ENV` (build et exécution).

## Pour aller plus loin

- [Référence du Dockerfile](https://docs.docker.com/reference/dockerfile/)
- [Cache de build](https://docs.docker.com/build/cache/)
- [Contexte de build et .dockerignore](https://docs.docker.com/build/concepts/context/)
- [Bonnes pratiques](https://docs.docker.com/build/building/best-practices/)

Réponds maintenant aux questions de compréhension ci-dessous.
