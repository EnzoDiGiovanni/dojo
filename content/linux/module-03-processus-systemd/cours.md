# Module 3 — Processus et services systemd

## Objectifs

À la fin de ce module, tu sais :

- observer les processus d'un serveur, les arrêter proprement ou brutalement, changer leur priorité ;
- trouver quel processus écoute sur un port ;
- piloter un service avec `systemctl`, et distinguer « démarré maintenant » de « démarré à chaque boot » ;
- écrire une unit de service, personnaliser celle d'un paquet sans la modifier, et planifier une tâche avec un timer.

## 1. Les processus

Un **processus** est un programme en cours d'exécution. Il a un numéro (PID), un parent (PPID), un utilisateur, un état, une priorité. Le premier processus du système, PID 1, est **systemd** : tous les autres en descendent.

```bash
ps aux                         # tous les processus : utilisateur, PID, %CPU, %MEM, commande
ps -ef --forest                # avec l'arbre parent/enfant
ps -o pid,user,ni,stat,cmd -p 1234   # colonnes choisies pour un processus
pgrep -a -u www-data           # PID et commande des processus d'un utilisateur
top                            # vue en direct ; dans top : P (tri CPU), M (tri mémoire), q (quitter)
```

Dans la colonne `STAT` : `R` en cours d'exécution, `S` endormi (en attente), `D` bloqué sur une entrée/sortie, `Z` zombie (terminé, son parent n'a pas lu son code de sortie), `T` arrêté.

## 2. Signaux

On ne « tue » pas un processus, on lui envoie un **signal** ; c'est lui qui décide quoi en faire, sauf pour deux signaux que le noyau applique de force.

| Signal | Numéro | Effet habituel |
|---|---|---|
| `SIGTERM` | 15 | « arrête-toi proprement » — défaut de `kill` ; le programme peut le gérer… ou l'ignorer |
| `SIGINT` | 2 | ce qu'envoie Ctrl+C |
| `SIGHUP` | 1 | beaucoup de services y répondent en relisant leur configuration |
| `SIGKILL` | 9 | arrêt immédiat par le noyau, impossible à intercepter : pas de nettoyage, fichiers peut-être incohérents |
| `SIGSTOP` / `SIGCONT` | 19 / 18 | suspendre / reprendre |

```bash
kill 1234            # SIGTERM
kill -HUP 1234       # relire la configuration
kill -9 1234         # SIGKILL : en dernier recours, après avoir laissé une chance à SIGTERM
pkill -u bob rsync   # par nom et utilisateur ; pgrep d'abord pour voir ce qui sera visé
```

La bonne pratique : `SIGTERM`, attendre quelques secondes, vérifier, et seulement ensuite `SIGKILL`.

## 3. Priorité : nice

La **valeur nice** va de -20 (très prioritaire) à 19 (passe après tout le monde). Elle ne limite pas un processus : elle décide qui passe en premier quand le processeur est disputé.

```bash
nice -n 10 tar -czf /srv/sauvegarde.tgz /srv/site   # lancer avec une priorité réduite
renice -n 15 -p 1234                                 # changer celle d'un processus qui tourne
```

Un utilisateur peut baisser la priorité de ses processus ; seul root peut l'augmenter.

## 4. Qui écoute sur ce port ?

```bash
ss -ltnp                  # l : en écoute, t : TCP, n : numérique, p : processus (sudo pour voir ceux des autres)
ss -ltnp 'sport = :5432'  # un port précis
sudo lsof -i :5432
```

Lis bien l'adresse d'écoute : `127.0.0.1:5432` n'accepte que les connexions locales, `0.0.0.0:5432` (ou `*:5432`) toutes les interfaces. Deux programmes ne peuvent pas écouter sur la même adresse et le même port : le second échoue avec « Address already in use ».

## 5. systemd et systemctl

systemd démarre et surveille les **services**, décrits par des fichiers d'**unit**. Il connaît leur état, leurs dépendances, et relance ceux qui le demandent.

```bash
systemctl status ssh             # état, PID principal, dernières lignes de journal
systemctl start|stop|restart ssh
systemctl reload ssh             # relire la configuration sans couper (si le service le permet)
systemctl enable ssh             # démarrer à chaque boot (crée un lien dans *.target.wants/)
systemctl enable --now ssh       # enable + start
systemctl disable ssh            # ne plus démarrer au boot (ne l'arrête pas !)
systemctl mask ssh               # interdire tout démarrage, même manuel ou par dépendance
systemctl is-active ssh ; systemctl is-enabled ssh
systemctl list-units --type=service --state=running
systemctl list-timers            # tâches planifiées par systemd
systemctl list-dependencies --reverse foo.service   # qui fait démarrer foo ?
```

**start** et **enable** sont indépendants : un service démarré à la main mais pas activé disparaît au prochain redémarrage ; un service activé mais pas démarré ne tournera qu'après le prochain. Et un service désactivé peut encore être démarré par autre chose : une autre unit qui en dépend, ou un **timer**.

`journalctl -u ssh` affiche le journal d'un service ; on y reviendra en détail au module 4.

## 6. Écrire une unit de service

Les units de l'administrateur vont dans `/etc/systemd/system/`. Celles des paquets sont dans `/usr/lib/systemd/system/` : on n'y touche **jamais**, la prochaine mise à jour écraserait tes changements.

```ini
# /etc/systemd/system/wiki.service
[Unit]
Description=Wiki interne
After=network.target

[Service]
Type=simple
User=wiki
Group=wiki
WorkingDirectory=/opt/wiki
Environment=WIKI_LANG=fr
EnvironmentFile=/etc/wiki/wiki.env
ExecStart=/usr/bin/node /opt/wiki/server.js --port 3010
Restart=on-failure
RestartSec=2

[Install]
WantedBy=multi-user.target
```

- `Type=simple` (défaut) : le processus lancé par `ExecStart` **est** le service et reste au premier plan. `Type=forking` est pour les vieux démons qui se détachent eux-mêmes : déclarer `forking` pour un programme qui reste au premier plan, c'est faire attendre systemd jusqu'à l'échec. `Type=oneshot` : une tâche qui se termine (utile avec les timers).
- `ExecStart` : chemin absolu de l'exécutable. Ce n'est **pas** une ligne de shell : pas de `cd`, de `&&`, de redirection ni de `$(…)`. Si tu as besoin d'un shell, appelle-le explicitement (`/bin/sh -c '…'`) ou écris un script.
- `User=` : le compte qui exécute le service. Ce compte doit pouvoir lire son code et écrire là où il écrit. `StateDirectory=wiki` demande à systemd de créer `/var/lib/wiki` et de le donner au compte du service.
- `EnvironmentFile=` : un fichier `CLE=valeur`. S'il est absent, le service ne démarre pas ; préfixé par `-`, il est optionnel.
- `Restart=` : `on-failure` relance après un code de sortie non nul ou un signal fatal ; `always` relance dans tous les cas.
- `[Install]` / `WantedBy=multi-user.target` : sans cette section, `systemctl enable` n'a rien à faire et le service ne démarrera jamais au boot.

Après toute création ou modification d'un fichier d'unit : `sudo systemctl daemon-reload`, puis redémarrer le service. `systemd-analyze verify wiki.service` signale beaucoup d'erreurs avant même de démarrer.

### Personnaliser l'unit d'un paquet : les drop-ins

```bash
sudo systemctl edit nginx        # crée /etc/systemd/system/nginx.service.d/override.conf
systemctl cat nginx              # affiche le fichier du paquet PUIS tous les drop-ins appliqués
```

Un drop-in ne contient que les lignes à ajouter ou changer, dans leur section :

```ini
[Service]
Environment=TZ=Europe/Paris
Restart=always
```

Pour **remplacer** une directive qui peut apparaître plusieurs fois (comme `ExecStart`), il faut d'abord la vider par une ligne `ExecStart=` vide, puis donner la nouvelle.

## 7. Les timers

Un timer déclenche un service (souvent `Type=oneshot`) à des dates précises. On le préfère de plus en plus à cron : journal intégré, dépendances, rattrapage des exécutions manquées.

```ini
# /etc/systemd/system/purge-wiki.timer   → déclenche purge-wiki.service (même nom)
[Unit]
Description=Purge nocturne du wiki

[Timer]
OnCalendar=*-*-* 03:30:00
Persistent=true

[Install]
WantedBy=timers.target
```

`OnCalendar` accepte `daily`, `hourly`, `Mon *-*-* 08:00`, `*:0/10` (toutes les 10 minutes)… `systemd-analyze calendar '*:0/10'` affiche les prochaines dates correspondantes : vérifie toujours ton expression. `Persistent=true` rattrape au démarrage une exécution manquée pendant que le serveur était éteint. On active **le timer**, pas le service : `systemctl enable --now purge-wiki.timer`.

## Pièges courants

- `kill -9` d'emblée : le programme n'a aucune chance de finir proprement.
- Confondre `start` et `enable`, ou croire que `disable` arrête le service.
- Oublier qu'un timer, ou une autre unit, peut redémarrer un service désactivé.
- Écrire `ExecStart` comme une ligne de shell, ou avec un chemin relatif sans `WorkingDirectory`.
- `Type=forking` pour un programme qui reste au premier plan.
- `User=` vers un compte qui ne peut pas écrire là où le service écrit.
- Modifier un fichier de `/usr/lib/systemd/system/` au lieu d'un drop-in.
- Oublier `daemon-reload` après avoir modifié une unit.

## Pour aller plus loin

- `man systemd.service`, `man systemd.exec` (User, Environment, StateDirectory…), `man systemd.timer`, `man systemd.time` (syntaxe d'OnCalendar)
- [Arch Wiki — systemd](https://wiki.archlinux.org/title/Systemd) (très complet, valable pour Ubuntu)
- `man 7 signal`

Réponds maintenant aux questions de compréhension ci-dessous pour débloquer les exercices.
