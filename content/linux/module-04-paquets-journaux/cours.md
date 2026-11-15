# Module 4 — Paquets APT et journaux système

## Objectifs

À la fin de ce module, tu sais :

- installer, mettre à jour, retenir et supprimer des logiciels avec APT, et savoir d'où vient un fichier ;
- ajouter un dépôt tiers sans affaiblir la sécurité du serveur, et réparer un APT bloqué ;
- reconstituer un incident à partir du journal système ;
- empêcher les journaux de remplir le disque.

Prérequis : les exercices de ce module téléchargent des paquets, ton serveur de labo a besoin d'Internet.

## 1. APT et dpkg

Un **paquet** `.deb` contient des fichiers, des métadonnées (version, dépendances) et des scripts exécutés à l'installation. Deux étages :

- **dpkg** installe un `.deb` qu'on lui donne, sans rien télécharger ni résoudre ;
- **APT** sait où trouver les paquets (les **dépôts**), calcule les dépendances, télécharge, puis appelle dpkg.

```bash
sudo apt update                  # télécharge la liste des paquets disponibles (ne met RIEN à jour)
apt list --upgradable
sudo apt upgrade                 # met à jour ce qui peut l'être sans supprimer de paquet
sudo apt full-upgrade            # idem, en acceptant d'ajouter ou supprimer des paquets si nécessaire
sudo apt install htop            # installer (dépendances comprises)
sudo apt remove htop             # désinstaller, en GARDANT ses fichiers de configuration
sudo apt purge htop              # désinstaller ET supprimer sa configuration
sudo apt autoremove              # supprimer les dépendances qui ne servent plus à rien
apt show htop ; apt policy htop  # description ; version installée, candidate, et de quel dépôt
```

`apt` est fait pour un humain ; dans un script, préfère `apt-get` (sortie stable) avec `-y`.

Pour enquêter :

```bash
dpkg -l | grep nginx             # paquets installés (ii = installé, rc = supprimé mais configuration restée)
dpkg -L curl                     # fichiers installés par un paquet
dpkg -S /usr/bin/ssh             # quel paquet a installé ce fichier ?
```

**Retenir** un paquet empêche qu'il change de version (ou soit installé) lors des mises à jour : utile quand une version a été validée et qu'une mise à jour doit être planifiée.

```bash
sudo apt-mark hold mariadb-server ; apt-mark showhold ; sudo apt-mark unhold mariadb-server
```

## 2. Les dépôts et leurs clés

Les dépôts sont déclarés dans `/etc/apt/sources.list.d/`. Ubuntu 24.04 utilise le format **deb822** (fichiers `.sources`) :

```
# /etc/apt/sources.list.d/ubuntu.sources
Types: deb
URIs: http://archive.ubuntu.com/ubuntu/
Suites: noble noble-updates
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
```

L'ancien format d'une ligne (fichiers `.list`) reste accepté : `deb [signed-by=/chemin/cle.gpg] http://… noble main`.

Chaque dépôt **signe** sa liste de paquets. APT vérifie la signature avec la clé désignée par `Signed-By`. Sans clé valide, il refuse le dépôt (`NO_PUBKEY`). C'est ce qui empêche un tiers de te servir des paquets modifiés.

Ajouter un dépôt tiers, proprement :

```bash
sudo install -d -m 0755 /etc/apt/keyrings
curl -fsSL https://editeur.example/cle.asc | sudo tee /etc/apt/keyrings/editeur.asc >/dev/null
# puis un fichier /etc/apt/sources.list.d/editeur.sources avec Signed-By: /etc/apt/keyrings/editeur.asc
sudo apt update
```

Ce qu'il ne faut **plus** faire, même si de vieilles documentations le proposent :

- `apt-key add`, ou copier la clé dans `/etc/apt/trusted.gpg.d/` : la clé de l'éditeur devient alors valable **pour tous les dépôts**, y compris pour signer un faux paquet Ubuntu ;
- `[trusted=yes]` ou `Trusted: yes` : plus aucune vérification de signature.

Une clé, un dépôt : c'est tout le sens de `Signed-By`.

## 3. Quand APT est bloqué

Lis toujours le **premier** message d'erreur, pas le dernier.

| Message | Ce qu'il veut dire |
|---|---|
| `E: dpkg was interrupted, you must manually run 'dpkg --configure -a'` | une installation précédente n'est pas allée au bout |
| `Sub-process /usr/bin/dpkg returned an error code (1)` | un script d'installation d'un paquet a échoué : remonte la sortie pour trouver lequel, et pourquoi |
| `… held broken packages` | les dépendances ne peuvent pas être satisfaites : un paquet retenu (`apt-mark showhold`), un paquet interdit par une préférence dans `/etc/apt/preferences.d/` (`apt policy <paquet>` montre sa priorité), ou un dépôt manquant |
| `404 Not Found` / `does not have a Release file` | une source pointe vers une adresse ou une suite qui n'existe pas |
| `Target … is configured multiple times` | le même dépôt est déclaré dans deux fichiers |
| `NO_PUBKEY …` | la clé du dépôt n'est pas disponible là où `Signed-By` l'indique |

`dpkg --audit` liste les paquets dans un état incohérent. `sudo dpkg --configure -a` reprend les configurations inachevées, et `sudo apt --fix-broken install` tente de compléter les dépendances. Aucune des deux ne corrige la **cause** : si le script d'un paquet échoue faute d'un fichier, il faut d'abord fournir ce fichier.

## 4. Le journal : journalctl

systemd-journald collecte tout ce que les services écrivent sur leur sortie, les messages du noyau et ceux de syslog, avec des métadonnées (unité, PID, priorité, date).

```bash
journalctl -u nginx                       # un service
journalctl -u nginx -b                    # depuis le démarrage en cours (-b -1 : le précédent)
journalctl -u nginx --since "2024-06-03 14:00" --until "14:30"
journalctl -p err -b                      # priorité err et plus grave (emerg, alert, crit, err)
journalctl -f -u nginx                    # suivre en direct
journalctl -u nginx -o cat                # seulement le texte des messages
journalctl -u nginx -o verbose            # tous les champs d'une entrée
journalctl --list-boots                   # les démarrages dont le journal garde une trace
journalctl _SYSTEMD_UNIT=nginx.service _PID=812
```

Les priorités, de la plus grave à la moins grave : `emerg` (0), `alert`, `crit`, `err` (3), `warning` (4), `notice`, `info`, `debug` (7). `-p warning` affiche warning **et tout ce qui est plus grave**.

Quand un service s'arrête, systemd écrit lui-même une ligne dans le journal de l'unité : « Main process exited, code=exited, status=3 », puis « Failed with result 'exit-code' », et éventuellement « Scheduled restart job ». C'est là qu'on lit le code de sortie et le nombre de tentatives.

Méthode d'enquête : partir du symptôme (quoi, quand), restreindre au service et à la période, regarder ce qui se passe **juste avant** la première erreur, et vérifier les autres services sur la même fenêtre de temps.

## 5. Où vont les journaux

Par défaut sur un serveur Ubuntu, journald garde le journal **sur disque** dans `/var/log/journal/`. Sur certaines images (conteneurs, images minimales), ce dossier n'existe pas : le journal reste **en mémoire** (`/run/log/journal`) et disparaît à chaque redémarrage. C'est réglé par `Storage=` (`auto`, `persistent`, `volatile`).

La configuration de journald se surcharge dans `/etc/systemd/journald.conf.d/*.conf`, section `[Journal]` :

```ini
[Journal]
Storage=persistent
SystemMaxUse=500M        # place maximale du journal sur disque
MaxRetentionSec=3month   # au-delà, les entrées sont supprimées
```

Puis `sudo systemctl restart systemd-journald`. Attention : quand on passe d'un journal en mémoire à un journal sur disque, journald continue d'écrire en mémoire jusqu'au prochain démarrage, sauf si on lui demande de tout transférer sur le disque avec `sudo journalctl --flush`. `journalctl --disk-usage` mesure la place prise, `journalctl --vacuum-size=200M` fait le ménage tout de suite.

En parallèle, **rsyslog** écrit les messages dans des fichiers texte classiques : `/var/log/syslog` (tout), `/var/log/auth.log` (authentifications, sudo, SSH).

## 6. logrotate

Les applications qui écrivent leurs propres fichiers de log les font grossir sans fin. **logrotate**, lancé chaque jour par un timer, les fait tourner selon des règles déposées dans `/etc/logrotate.d/` :

```
/var/log/wiki/*.log {
    weekly
    rotate 8            # garder 8 anciens fichiers
    compress
    delaycompress       # ne compresser qu'à la rotation suivante
    missingok           # pas d'erreur si aucun fichier
    notifempty          # ne pas faire tourner un fichier vide
    create 0640 wiki adm
    sharedscripts
    postrotate
        systemctl kill -s HUP wiki.service
    endscript
}
```

Le point délicat : un programme qui a **ouvert** son fichier de log continue d'écrire dans ce fichier même après qu'il a été renommé en `app.log.1`. Deux solutions :

- prévenir le programme pour qu'il rouvre son fichier (`postrotate` avec le signal que le programme comprend, souvent `HUP`) : c'est la bonne solution quand le programme le permet ;
- `copytruncate` : logrotate copie le fichier puis le vide sur place. Ça marche avec tout programme, au risque de perdre les lignes écrites entre la copie et la troncature.

Tester sans attendre le lendemain : `sudo logrotate -d /etc/logrotate.d/wiki` (simulation, affiche ce qui serait fait) et `sudo logrotate -f /etc/logrotate.d/wiki` (rotation forcée).

## Pièges courants

- Croire que `apt update` met à jour les logiciels.
- `remove` au lieu de `purge` quand on veut repartir de zéro : l'ancienne configuration est réutilisée à la réinstallation.
- Ajouter une clé de dépôt dans `trusted.gpg.d`, ou `trusted=yes` « pour que ça marche ».
- Relancer `apt --fix-broken install` en boucle sans lire pourquoi le script du paquet échoue.
- Chercher un incident d'hier dans un journal non persistant, après un redémarrage.
- Une rotation qui renomme le fichier sans prévenir le programme : il écrit dans `app.log.1` pour toujours.

## Pour aller plus loin

- `man apt`, `man sources.list` (formats et options, dont `Signed-By`), `man apt_preferences`
- `man journalctl`, `man journald.conf`, `man logrotate`
- [Debian Wiki — DebianRepository/UseThirdParty](https://wiki.debian.org/DebianRepository/UseThirdParty) (la méthode recommandée pour les dépôts tiers)

Réponds maintenant aux questions de compréhension ci-dessous pour débloquer les exercices.
