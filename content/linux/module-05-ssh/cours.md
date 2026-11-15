# Module 5 — SSH et sécurisation des accès

## Objectifs

À la fin de ce module, tu sais :

- te connecter à un serveur par clé, copier des fichiers, et organiser tes connexions ;
- durcir le serveur SSH sans te fermer la porte au nez ;
- lire les tentatives de connexion et bannir automatiquement ceux qui insistent.

Dans ce module, ton serveur de labo est joignable en SSH depuis ta machine, sur un port propre à chaque exercice (indiqué dans la consigne). La console `sh vps.sh console` reste ta porte de secours, comme la console web d'un hébergeur.

## 1. Comment SSH authentifie

SSH chiffre la connexion, puis vérifie deux identités :

1. **Le serveur** prouve qui il est avec sa clé d'hôte. À la première connexion, ton client affiche son empreinte et la mémorise dans `~/.ssh/known_hosts`. Si elle change ensuite, le client refuse de continuer : soit le serveur a été réinstallé, soit quelqu'un s'intercale.
2. **L'utilisateur** prouve qui il est, par mot de passe ou, bien mieux, par **clé**.

Une paire de clés, c'est une clé **privée** (qui ne quitte jamais ton poste) et une clé **publique** (que tu peux donner à qui tu veux). Le serveur garde ta clé publique dans `~/.ssh/authorized_keys` du compte cible, et te demande de prouver que tu détiens la clé privée correspondante. Rien de secret ne transite.

```bash
ssh-keygen -t ed25519 -C "alice@portable" -f ~/.ssh/id_wiki   # génère id_wiki (privée) et id_wiki.pub
ssh-copy-id -i ~/.ssh/id_wiki.pub -p 2222 alice@wiki.example   # ajoute la clé publique, en s'authentifiant une dernière fois par mot de passe
ssh -i ~/.ssh/id_wiki -p 2222 alice@wiki.example
ssh-keygen -lf ~/.ssh/id_wiki.pub                              # empreinte de la clé (SHA256:…)
```

Protège ta clé privée par une **phrase de passe** : sans elle, quiconque copie le fichier devient toi. `ssh-agent` (souvent lancé par ta session) garde la clé déverrouillée en mémoire, pour ne pas retaper la phrase à chaque connexion : `ssh-add ~/.ssh/id_wiki`.

**Les droits comptent.** sshd refuse une clé autorisée si le dossier personnel, `~/.ssh` ou `authorized_keys` sont modifiables par d'autres que le propriétaire (option `StrictModes`, active par défaut). Valeurs saines : `~/.ssh` en `700`, `authorized_keys` en `600`, le tout appartenant au compte. Côté client, ssh refuse aussi une clé privée lisible par d'autres. Chaque ligne d'`authorized_keys` est **une** clé, sur **une seule** ligne : un copier-coller qui la coupe en deux la rend invalide.

## 2. Copier des fichiers et organiser ses connexions

```bash
scp -P 2222 rapport.pdf alice@wiki.example:/srv/partage/        # attention : -P majuscule pour scp
scp -P 2222 alice@wiki.example:/var/log/wiki/erreurs.log .
rsync -av -e 'ssh -p 2222' site/ alice@wiki.example:/srv/site/  # synchronise, ne recopie que ce qui a changé
```

Le fichier `~/.ssh/config` évite de retaper options et ports :

```
Host wiki
    HostName wiki.example
    Port 2222
    User alice
    IdentityFile ~/.ssh/id_wiki
    IdentitiesOnly yes
```

`ssh wiki`, `scp fichier wiki:/tmp/` fonctionnent ensuite. `IdentitiesOnly yes` évite que le client essaie toutes les clés de ton agent (et se fasse refuser après trop de tentatives). `ssh -G wiki` affiche la configuration effective qui serait utilisée, sans se connecter ; `ssh -F fichier` utilise un autre fichier de configuration.

## 3. Durcir le serveur : sshd

La configuration du serveur est `/etc/ssh/sshd_config`, qui inclut au début tous les fichiers `/etc/ssh/sshd_config.d/*.conf`, dans l'ordre alphabétique. Règle capitale : **pour la plupart des directives, la première valeur lue l'emporte**. Un fichier `50-cloud-init.conf` posé par l'hébergeur avec `PasswordAuthentication yes` gagne donc contre ton `60-securite.conf` qui dit `no`. Nomme tes fichiers pour qu'ils passent en premier, ou corrige celui qui contredit.

Directives essentielles :

```
PermitRootLogin no                 # root ne se connecte pas directement : on passe par un compte nominatif et sudo
PasswordAuthentication no          # plus de mot de passe…
KbdInteractiveAuthentication no    # …ni par l'autre méthode qui demande un mot de passe
PubkeyAuthentication yes
AllowGroups ssh-acces              # seuls les membres de ce groupe peuvent se connecter
```

`AllowUsers` / `AllowGroups` sont des listes **blanches** : si tu en mets une, tous ceux qui n'y figurent pas sont refusés, toi compris. Un bloc `Match User …` ou `Match Group …` permet des réglages par compte.

Procédure sans risque, à suivre **à chaque** modification :

1. garde une session SSH ouverte (ou la console de l'hébergeur) ;
2. `sudo sshd -t` vérifie la syntaxe : s'il affiche quoi que ce soit, ne va pas plus loin ;
3. `sudo sshd -T | grep -i passwordauth` affiche la valeur **effective**, après lecture de tous les fichiers ; `-C user=alice,host=x,addr=203.0.113.4` la calcule pour une connexion donnée (utile avec les `Match`) ;
4. `sudo systemctl reload ssh` ;
5. depuis un **autre** terminal, ouvre une nouvelle connexion. Ne ferme l'ancienne qu'une fois la nouvelle réussie.

Sur Ubuntu 24.04, `ssh.socket` écoute sur le port et démarre `ssh.service` à la première connexion. Les réglages ci-dessus se rechargent normalement, mais le port d'écoute, lui, se change dans le socket (`systemctl edit ssh.socket`).

Pour vérifier depuis l'extérieur quelles méthodes le serveur propose à un compte, demande-lui de n'en essayer aucune : `ssh -o PreferredAuthentications=none alice@wiki.example` répond `Permission denied (publickey)` ou `(publickey,password)`.

## 4. Surveiller et bannir

Toutes les authentifications sont journalisées : dans le journal de `ssh.service`, et dans `/var/log/auth.log`.

```
Accepted publickey for alice from 198.51.100.7 port 51234 ssh2: ED25519 SHA256:3fW…
Failed password for invalid user admin from 203.0.113.50 port 40112 ssh2
Invalid user oracle from 203.0.113.50 port 40120
Authentication refused: bad ownership or modes for directory /home/alice
```

Un serveur exposé sur Internet reçoit des milliers de tentatives par jour. Désactiver les mots de passe les rend inutiles ; **fail2ban** réduit en plus le bruit et la charge : il lit les journaux, compte les échecs par adresse, et ajoute une règle de pare-feu qui bannit l'adresse pour un temps.

```ini
# /etc/fail2ban/jail.d/sshd.local   (jamais jail.conf, écrasé par les mises à jour)
[sshd]
enabled  = true
maxretry = 5         # échecs tolérés…
findtime = 10m       # …dans cette fenêtre de temps
bantime  = 1h        # durée du bannissement
ignoreip = 127.0.0.1/8 ::1 198.51.100.0/24   # adresses jamais bannies : les tiennes
```

```bash
sudo systemctl restart fail2ban
sudo fail2ban-client status sshd                    # adresses actuellement bannies
sudo fail2ban-client get sshd maxretry
sudo fail2ban-client set sshd unbanip 203.0.113.50  # débannir
```

Pense à `ignoreip` : sans lui, une série de fautes de frappe sur ta propre clé te bannit de ton serveur.

## Pièges courants

- Désactiver les mots de passe avant d'avoir vérifié qu'une connexion par clé fonctionne.
- Un fichier de `sshd_config.d` qui passe avant le tien et impose la valeur contraire.
- `AllowUsers`/`AllowGroups` sans s'y inclure.
- Des droits trop ouverts sur le dossier personnel, `~/.ssh` ou `authorized_keys` : la clé est ignorée sans message côté client.
- Une clé publique coupée en deux lignes par un copier-coller.
- `scp -p` au lieu de `scp -P` pour le port.
- Oublier `ignoreip` dans fail2ban.

## Pour aller plus loin

- `man sshd_config`, `man ssh_config`, `man ssh-keygen`
- [Mozilla — recommandations OpenSSH](https://infosec.mozilla.org/guidelines/openssh)
- [ANSSI — recommandations pour un usage sécurisé d'OpenSSH](https://cyber.gouv.fr/publications/openssh-secure-use-recommendations)
- `man jail.conf` (fail2ban)

Réponds maintenant aux questions de compréhension ci-dessous pour débloquer les exercices.
