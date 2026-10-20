# Module 1 — Premiers conteneurs

## Objectifs

À la fin de ce module, tu sais :

- expliquer ce qu'est une image, ce qu'est un conteneur, et ce que fait `docker run` étape par étape ;
- piloter le cycle de vie d'un conteneur et aller voir ce qui se passe dedans ;
- publier un port et configurer un conteneur au lancement ;
- obtenir une information précise avec `docker inspect`.

Prérequis : `docker ps` fonctionne dans ton terminal sans `sudo`.

## 1. Image et conteneur

Une **image** est un modèle **en lecture seule** : un empilement de *couches* (des systèmes de fichiers partiels superposés) plus des métadonnées (commande par défaut, variables d'environnement, ports documentés…). Une image ne « tourne » jamais.

Un **conteneur** est une instance d'une image : Docker pose par-dessus les couches de l'image une **couche inscriptible** propre à ce conteneur, puis lance un **processus** isolé (namespaces, cgroups) qui voit ce système de fichiers comme sa racine.

L'analogie classe / objet tient bien : une image, autant de conteneurs que tu veux, chacun avec son propre état. Si un conteneur modifie un fichier, la modification va dans *sa* couche inscriptible ; l'image et les autres conteneurs ne voient rien.

Une image se désigne par `dépôt:tag`, par exemple `redis:7-alpine`. Sans tag, Docker suppose `latest` — qui n'est **qu'un nom de tag**, pas une garantie de version récente. Les images viennent d'un *registry* (par défaut Docker Hub).

```bash
docker image ls                 # images présentes localement
docker pull redis:7-alpine      # télécharger sans lancer
docker image history redis:7-alpine   # les couches et les instructions qui les ont créées
```

## 2. Ce que fait vraiment `docker run`

```bash
docker run -d --name cache redis:7-alpine
```

C'est un raccourci pour quatre opérations :

1. **pull** de l'image si elle n'est pas présente localement ;
2. **create** : création du conteneur (couche inscriptible, configuration, réseau) — état `created` ;
3. **start** : lancement du processus principal — état `running` ;
4. **attach** (sauf avec `-d`) : ton terminal est relié à la sortie du processus.

Point capital : **un conteneur vit exactement aussi longtemps que son processus principal**. Quand ce processus se termine, le conteneur passe à l'état `exited`. Un conteneur qui « s'arrête tout de suite » est presque toujours un conteneur dont le processus principal a terminé (ou planté).

```bash
docker run alpine:3.19 echo bonjour   # affiche "bonjour" puis le conteneur s'arrête : echo a fini
docker run -it alpine:3.19 sh         # -i garde l'entrée ouverte, -t alloue un terminal : un shell interactif
```

Tout ce qui suit le nom de l'image **remplace la commande par défaut** de l'image et devient la commande du conteneur (ou ses arguments, on verra la nuance au module 2). Les options de Docker (`-d`, `--name`, `-p`, `-e`…) se placent donc **avant** l'image.

## 3. Cycle de vie

| Commande | Effet |
|---|---|
| `docker ps` / `docker ps -a` | conteneurs en cours / tous, y compris arrêtés |
| `docker stop <c>` | envoie le signal d'arrêt de l'image (SIGTERM par défaut), attend 10 s, puis SIGKILL |
| `docker kill <c>` | envoie SIGKILL immédiatement (aucune chance de s'arrêter proprement) |
| `docker start <c>` | relance un conteneur arrêté (même couche inscriptible, mêmes réglages) |
| `docker rm <c>` | supprime un conteneur arrêté et sa couche inscriptible (`-f` pour forcer s'il tourne) |
| `docker run --rm …` | supprime automatiquement le conteneur dès qu'il s'arrête |

Le **code de sortie** du processus est conservé dans l'état du conteneur. Par convention, 0 signifie succès ; 137 = 128 + 9, c'est-à-dire « tué par SIGKILL ».

Les conteneurs arrêtés ne disparaissent pas tout seuls : ils occupent de la place et gardent leur nom. Deux conteneurs ne peuvent pas porter le même nom, même si l'un est arrêté.

## 4. Regarder dedans : logs et exec

Docker capture ce que le processus principal écrit sur sa sortie standard et sa sortie d'erreur :

```bash
docker logs cache              # tout depuis le démarrage
docker logs -f --tail 20 cache # les 20 dernières lignes puis en continu
```

Une application qui écrit dans un fichier plutôt que sur stdout n'apparaîtra **pas** dans `docker logs`.

Pour lancer une commande **supplémentaire** dans un conteneur qui tourne :

```bash
docker exec cache redis-cli ping     # une commande ponctuelle
docker exec -it cache sh             # un shell interactif dans le conteneur
```

`exec` ne fonctionne que sur un conteneur en cours d'exécution, et seulement avec les programmes présents dans l'image (beaucoup d'images minimales n'ont même pas de shell). Pour copier des fichiers entre l'hôte et un conteneur : `docker cp`.

## 5. Publier un port

Un conteneur a sa propre pile réseau. Un service qui écoute sur le port 6379 *dans* le conteneur n'est pas joignable depuis ton hôte tant que tu ne le **publies** pas :

```bash
docker run -d --name web -p 8000:80 httpd:2.4-alpine
#                           │    └── port DANS le conteneur
#                           └─────── port sur l'HÔTE
```

Par défaut, Docker écoute sur **toutes** les interfaces de l'hôte (`0.0.0.0`) : le service devient joignable depuis ton réseau local. Pour le limiter à ta machine : `-p 127.0.0.1:8000:80`.

Côté conteneur, le service doit écouter sur `0.0.0.0` et non sur `127.0.0.1`, sinon il n'accepte que les connexions venant… de l'intérieur du conteneur.

`docker port <c>` affiche les publications d'un conteneur.

## 6. Configurer un conteneur au lancement

- **Variables d'environnement** : `-e CLE=valeur` (ou `--env-file fichier`). C'est le moyen standard de configurer une image prévue pour.
- **Arguments** : tout ce qui suit l'image est passé comme commande ou arguments.
- **Politique de redémarrage** : `--restart` vaut `no` (défaut), `on-failure[:N]` (seulement si le code de sortie est non nul, au plus N fois), `always` (toujours, y compris au redémarrage du daemon), `unless-stopped` (comme `always`, sauf si tu l'avais arrêté toi-même).

```bash
docker run -d --name cache2 --restart on-failure:5 -e TZ=Europe/Paris redis:7-alpine --maxmemory 64mb
```

Ici `--maxmemory 64mb` est un argument passé au processus redis, pas une option Docker.

La configuration d'un conteneur est figée à sa création : pour changer un port ou une variable, on supprime et on recrée.

## 7. Interroger Docker : inspect

`docker inspect` renvoie le JSON complet d'un objet (conteneur, image, réseau, volume) :

```bash
docker inspect cache                                   # tout
docker inspect -f '{{.State.Status}}' cache            # un champ (template Go)
docker inspect -f '{{json .Config.Env}}' cache         # un sous-objet en JSON
docker image inspect -f '{{.Config.ExposedPorts}}' redis:7-alpine
```

Repères utiles dans un conteneur : `.State` (statut, code de sortie, dates), `.Config` (image, commande, env), `.HostConfig` (ports publiés, politique de redémarrage, montages), `.NetworkSettings` (réseaux, adresses IP). Dans une image : `.Config` (commande par défaut, env, ports, signal d'arrêt) et `.RootFS.Layers`.

Astuce : quand tu ne sais pas où se trouve une information, affiche tout le JSON et cherche (`docker inspect cache | less`).

## Pièges courants

- Mettre une option Docker **après** le nom de l'image : elle est passée au processus, pas à Docker.
- Inverser l'ordre de `-p` : c'est toujours `hôte:conteneur`.
- Croire qu'un conteneur arrêté a disparu : `docker ps -a`.
- Modifier un conteneur à la main (`exec`) et s'attendre à retrouver la modification dans un autre conteneur de la même image.
- Confondre `stop` et `kill` : seul le premier laisse au processus une chance de s'arrêter proprement.

## Pour aller plus loin

- [docker run — référence](https://docs.docker.com/reference/cli/docker/container/run/)
- [Cycle de vie et politiques de redémarrage](https://docs.docker.com/engine/containers/start-containers-automatically/)
- [Formatage des sorties (templates Go)](https://docs.docker.com/engine/cli/formatting/)

Réponds maintenant aux questions de compréhension ci-dessous pour débloquer les exercices.
