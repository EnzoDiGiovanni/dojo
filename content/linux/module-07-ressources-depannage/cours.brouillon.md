# Module 7 — Ressources et dépannage

## Objectifs

À la fin de ce module, tu sais :

- mesurer ce qui consomme le processeur, la mémoire, le disque et les inodes, et l'attribuer à un processus ou à un dossier ;
- borner les ressources d'un service pour qu'il ne puisse pas emporter tout le serveur ;
- mener un diagnostic méthodique sur un serveur en panne, sans aggraver la situation.

Ce module réutilise tout le parcours : fichiers, droits, services, journaux, cron.

## 1. La méthode

Un incident se traite dans cet ordre :

1. **Observer le symptôme** précisément : quoi, depuis quand, pour qui. « Le site est lent » devient « la page d'accueil met 8 s depuis 14 h, pour tout le monde ».
2. **Mesurer** avant de toucher : charge, mémoire, disque, services en échec, journaux sur la fenêtre de temps.
3. **Formuler une hypothèse**, et la vérifier par une mesure.
4. **Corriger la cause**, pas seulement le symptôme. Redémarrer un service rend la main, mais si la cause reste, l'incident reviendra.
5. **Vérifier** que le symptôme a disparu, et qu'il ne reviendra pas (au prochain redémarrage, à la prochaine exécution de la tâche planifiée…).
6. **Noter** ce qui s'est passé : c'est le post-mortem, qui servira la prochaine fois.

Premier réflexe sur un serveur inconnu :

```bash
uptime                         # charge moyenne sur 1, 5, 15 minutes
systemctl --failed             # services en échec
df -h ; df -i                  # place et inodes, par système de fichiers
free -h                        # mémoire et swap
journalctl -p err -b --since "1 hour ago"
```

## 2. Processeur et charge

La **charge** (load average) est le nombre moyen de processus qui veulent le processeur (ou attendent un disque). À comparer au nombre de cœurs (`nproc`) : une charge de 4 sur 4 cœurs est pleine, sur 16 elle est tranquille.

```bash
top                            # P : trier par CPU ; 1 : détail par cœur ; regarde aussi %wa (attente disque)
ps -eo pid,user,pcpu,etime,cmd --sort=-pcpu | head
pgrep -c -f rapport            # combien d'instances d'un même programme ?
```

Un classique : une tâche planifiée toutes les minutes qui dure plus d'une minute. Les instances s'empilent, la charge grimpe, chaque instance va encore plus lentement : l'effet boule de neige. La correction est un verrou (`flock -n`, module 6), pas un `kill` à répétition.

## 3. Mémoire

```bash
free -h                         # « available » est ce qui compte, pas « free »
ps -eo pid,user,rss,cmd --sort=-rss | head   # RSS en Kio : la mémoire réellement occupée
systemd-cgtop                   # consommation par service (cgroup)
systemctl status monservice     # ligne Memory: actuel, maximum, pic
```

Linux utilise la mémoire libre comme cache disque : un `free` presque nul n'est pas un problème, un `available` presque nul en est un. Quand la mémoire manque vraiment, le noyau tue un processus : c'est l'**OOM killer**. Le journal le mentionne (`Out of memory: Killed process …`, ou pour un service limité par systemd : `A process of this unit has been killed by the OOM killer` et `Failed with result 'oom-kill'`).

Le **swap** prolonge la mémoire sur le disque. Il évite des arrêts brutaux, mais un serveur qui swappe beaucoup devient très lent.

## 4. Disque et inodes

```bash
df -h                                       # place par système de fichiers
du -xh --max-depth=1 /var | sort -h         # quel dossier occupe la place (-x : sans changer de système de fichiers)
find /var -xdev -type f -size +100M -exec ls -lh {} +
df -i                                       # inodes : un fichier = un inode, quelle que soit sa taille
sudo lsof +L1                               # fichiers supprimés mais encore ouverts
```

Deux pannes trompeuses :

- **« No space left on device » alors que `df -h` montre de la place** : il n'y a plus d'**inodes**. Des millions de petits fichiers (sessions, cache, files d'attente) les ont tous consommés. On supprime les fichiers inutiles, et on automatise leur nettoyage.
- **`df` dit plein, `du` trouve beaucoup moins** : un fichier a été supprimé alors qu'un processus le tient encore ouvert. Son espace n'est libéré que quand le dernier processus le ferme. `lsof +L1` le montre ; redémarrer le service (ou le faire rouvrir ses fichiers) libère la place.

Nettoyage automatique de fichiers temporaires : **systemd-tmpfiles**, qui lit `/etc/tmpfiles.d/*.conf` et tourne chaque jour.

```
# /etc/tmpfiles.d/miniatures.conf : type chemin droits propriétaire groupe âge
d /var/cache/miniatures 0750 www-data www-data 7d
```

`sudo systemd-tmpfiles --clean` applique tout de suite le nettoyage (suppression de ce qui est plus vieux que l'âge indiqué).

## 5. Borner un service

systemd place chaque service dans un **cgroup** et peut limiter ses ressources. Dans un drop-in (`systemctl edit monservice`) :

```ini
[Service]
MemoryMax=300M        # au-delà, le noyau tue le service (OOM) plutôt que de laisser le serveur entier manquer de mémoire
MemorySwapMax=0       # sans ça, un serveur avec swap laisse le service déborder dans le swap au lieu de l'arrêter
MemoryHigh=250M       # seuil où le noyau commence à freiner le service, avant le maximum
CPUQuota=50%          # au plus un demi-processeur (200% = deux processeurs)
TasksMax=200          # nombre maximal de processus et threads
Restart=on-failure    # relancer après un arrêt par le noyau
```

`systemctl show monservice -p MemoryMax -p CPUQuotaPerSecUSec` affiche les valeurs appliquées ; `systemd-cgtop` montre la consommation en direct. Une limite ne corrige pas une fuite de mémoire : elle contient les dégâts en attendant la correction du programme.

## 6. Au démarrage

Un service qui marche quand on le lance à la main mais pas au démarrage du serveur souffre presque toujours d'un problème d'**ordre** ou d'**environnement** :

- il démarre avant ce dont il a besoin (base de données, réseau, point de montage) : `After=` règle l'ordre, `Requires=`/`Wants=` la dépendance ;
- il compte sur un dossier de `/run` créé à la main un jour, effacé à chaque démarrage : `RuntimeDirectory=` le recrée ;
- il s'arrête au premier échec faute de `Restart=`.

```bash
systemd-analyze critical-chain monservice.service   # ce qu'il a attendu, et combien de temps
systemctl list-dependencies monservice
journalctl -b -u monservice
```

## Pièges courants

- Redémarrer avant de mesurer : la preuve disparaît avec le redémarrage.
- Supprimer un gros fichier de log encore ouvert, et s'étonner que la place ne revienne pas.
- Chercher de la place quand ce sont les inodes qui manquent.
- `kill` à répétition sur des instances empilées, sans corriger la tâche qui les crée.
- Une limite mémoire sans `MemorySwapMax=0` sur un serveur avec swap.
- Corriger le symptôme et oublier de vérifier qu'il ne reviendra pas au prochain redémarrage.

## Pour aller plus loin

- [Linux Performance Analysis in 60 seconds (Brendan Gregg)](https://www.brendangregg.com/Articles/Netflix_Linux_Perf_Analysis_60s.pdf)
- `man systemd.resource-control`, `man tmpfiles.d`, `man lsof`
- [Google SRE Book — Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)

Réponds maintenant aux questions de compréhension ci-dessous pour débloquer les exercices.
