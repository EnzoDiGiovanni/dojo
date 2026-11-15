# Module 2 — Utilisateurs, groupes et permissions

## Objectifs

À la fin de ce module, tu sais :

- créer, modifier, verrouiller et supprimer des comptes et des groupes ;
- lire et poser des droits, et prédire qui peut lire, écrire ou traverser un chemin ;
- monter un répertoire partagé par une équipe ;
- déléguer un droit d'administration précis avec sudo, sans ouvrir de porte dérobée.

## 1. Comptes et groupes

Pour le noyau, un utilisateur est un **numéro** (UID) et un groupe aussi (GID). Les noms ne sont qu'une table de correspondance, dans trois fichiers texte :

| Fichier | Une ligne par… | Champs utiles |
|---|---|---|
| `/etc/passwd` | compte | `nom:x:UID:GID principal:commentaire (nom complet):dossier personnel:shell` |
| `/etc/group` | groupe | `nom:x:GID:membres secondaires séparés par des virgules` |
| `/etc/shadow` | compte (lisible par root seul) | empreinte du mot de passe, dates d'expiration |

Chaque utilisateur a **un groupe principal** (celui de `/etc/passwd`, souvent un groupe à son nom) et **des groupes secondaires**. `id alice` affiche tout ; `getent passwd alice` lit la base des comptes, quelle que soit sa source.

Les UID < 1000 sont réservés aux **comptes système** : ceux qui font tourner des services (`www-data`, `mysql`…). Ils n'ont pas besoin d'un shell de connexion : on leur donne `/usr/sbin/nologin`.

```bash
sudo useradd -m -s /bin/bash -c "Alice Durand" alice   # -m : crée /home/alice depuis /etc/skel
sudo passwd alice                                     # définir son mot de passe
sudo groupadd compta
sudo usermod -aG compta alice                         # -a : AJOUTER au groupe (voir le piège plus bas)
sudo useradd -r -s /usr/sbin/nologin -d /var/lib/minio minio   # -r : compte système
sudo usermod -L alice ; sudo passwd -S alice          # verrouiller, puis voir l'état (L = verrouillé)
sudo chage -E 2025-12-31 alice                        # le compte expire à cette date
sudo userdel -r alice                                 # supprimer le compte ET son dossier personnel
```

Le piège : `usermod -G compta alice` sans `-a` **remplace** la liste des groupes secondaires d'alice par `compta` seul. Elle perd silencieusement tous ses autres groupes.

Un changement de groupe ne s'applique qu'aux **nouvelles sessions** : un utilisateur déjà connecté doit se reconnecter (ou utiliser `newgrp`).

Supprimer un compte ne supprime pas les fichiers qu'il possède ailleurs que dans son dossier personnel. Ces fichiers gardent l'UID numérique : `ls -l` affiche alors un nombre au lieu d'un nom, et le prochain compte créé avec ce même UID en hériterait. `find / -xdev -nouser` les retrouve, `find / -xdev -user alice` aussi, tant que le compte existe.

## 2. Lire les droits

```
-rw-r----- 1 alice compta 2048 mars  3 10:12 budget.ods
drwxr-x--x 2 root  www-data 4096 mars 3 10:12 site/
│└┬┘└┬┘└┬┘   └─┬─┘ └──┬──┘
│ │  │  │      │      └ groupe propriétaire
│ │  │  │      └ utilisateur propriétaire
│ │  │  └ droits des autres (o)
│ │  └ droits du groupe (g)
│ └ droits du propriétaire (u)
└ type : - fichier, d dossier, l lien
```

Le système applique **une seule** des trois catégories, la première qui correspond : propriétaire, sinon membre du groupe, sinon autres. Root ignore les droits de lecture et d'écriture.

Le sens de `r`, `w`, `x` **change** entre fichier et dossier :

| | Fichier | Dossier |
|---|---|---|
| `r` | lire le contenu | lister les noms qu'il contient |
| `w` | modifier le contenu | créer, renommer, **supprimer** des entrées |
| `x` | exécuter | **traverser** : y entrer, atteindre ce qu'il contient |

Conséquences à retenir :

- Pour atteindre `/srv/a/b/fichier`, il faut `x` sur **chaque** dossier du chemin. Un fichier lisible par tous reste inaccessible derrière un dossier non traversable.
- Supprimer un fichier dépend des droits sur le **dossier**, pas sur le fichier.
- Un script sans `x` se lance quand même avec `bash script.sh` (bash ne fait que le lire), mais pas avec `./script.sh`.

## 3. Poser des droits

```bash
chmod g+w,o-rwx budget.ods   # symbolique : ajouter/retirer à u, g, o (a = tous)
chmod 640 budget.ods         # octal : r=4, w=2, x=1, additionnés pour u, g, o → rw- r-- ---
chmod -R g+rX /srv/docs      # X majuscule : x seulement sur les dossiers (et les fichiers déjà exécutables)
chown alice:compta budget.ods
chown -R :compta /srv/docs   # seulement le groupe
```

Quelques valeurs courantes : `644` (fichier lisible par tous), `600` (privé), `755` (dossier ou programme public), `750` (dossier d'équipe), `700` (dossier privé).

Le **umask** retire des droits à tout ce qu'un processus crée. Avec le umask par défaut `022`, un fichier naît en `644` et un dossier en `755` : le groupe ne peut pas écrire. Un umask `002` donne `664` / `775`. Il se règle par session : dans `~/.profile` pour un utilisateur, dans un fichier de `/etc/profile.d/` pour toutes les connexions, ou par service (on le verra avec systemd).

## 4. Droits spéciaux pour le travail en équipe

| Droit | Sur un dossier | Affichage |
|---|---|---|
| **setgid** (`chmod g+s`, octal 2000) | ce qui est créé dedans hérite du **groupe du dossier**, et les sous-dossiers héritent du setgid | `drwxrwsr-x` |
| **sticky bit** (`chmod +t`, octal 1000) | on ne peut supprimer ou renommer que **ses propres** fichiers, même avec `w` sur le dossier | `drwxrwxrwt` (c'est le cas de `/tmp`) |

Recette d'un dossier d'équipe : un groupe, le dossier qui lui appartient, `rwx` pour le groupe, rien pour les autres, setgid pour que tout ce qui est créé appartienne au groupe, et un umask qui laisse le groupe écrire. Le setgid ne s'applique qu'à ce qui est **créé** après : il faut aussi corriger l'existant (`chgrp -R`, `find -type d -exec chmod g+s {} +`).

Les ACL (`setfacl`, paquet `acl`) permettent des droits plus fins, utilisateur par utilisateur, et des droits par défaut hérités. On les garde en réserve pour les cas que les groupes ne savent pas exprimer.

Le setuid (`chmod u+s`, sur un programme) le fait tourner avec les droits de son propriétaire : c'est ainsi que `passwd` peut écrire dans `/etc/shadow`. N'en pose jamais sur un script.

## 5. sudo

`sudo` exécute une commande avec l'identité d'un autre utilisateur (root par défaut), si une règle l'autorise. Les règles vivent dans `/etc/sudoers` et dans des fichiers de `/etc/sudoers.d/`. On n'édite **jamais** ces fichiers directement : une erreur de syntaxe peut bloquer tout `sudo`, et donc toute administration.

```bash
sudo visudo -f /etc/sudoers.d/sauvegarde   # éditeur qui vérifie la syntaxe avant d'enregistrer
sudo visudo -c                             # vérifie toute la configuration
sudo -l -U alice                           # ce qu'alice a le droit de faire
```

Une règle se lit : **qui** `hôtes` = (**en tant que qui**) **quoi**.

```
# Le groupe sauvegarde peut lancer ce script précis en root, sans mot de passe
%sauvegarde ALL=(root) NOPASSWD: /usr/local/sbin/sauvegarde-nuit --complete
```

Les commandes s'écrivent en **chemin absolu**, et les arguments font partie de la règle : sans argument, tous les arguments sont permis ; avec des arguments, seuls ceux-là. Un joker `*` dans les arguments est presque toujours une erreur : il autorise bien plus que ce qu'on croit.

Le vrai danger de sudo, ce sont les **évasions** : autoriser un programme qui sait lancer autre chose revient à autoriser un shell root. Un éditeur (`vim`, `nano`) ouvre un shell ou écrit n'importe quel fichier, `less` aussi, `find` a `-exec`, et beaucoup de commandes « d'administration » appellent un éditeur ou un pager. Autorise une **action** précise, jamais un outil généraliste.

Pour donner un accès en lecture aux journaux, pas besoin de sudo : sur Ubuntu, le groupe `adm` lit `/var/log`.

## Pièges courants

- `usermod -G` sans `-a` : l'utilisateur perd ses autres groupes.
- Oublier que le changement de groupe ne vaut que pour les nouvelles sessions.
- Donner `r` sans `x` à un dossier : on voit les noms, on n'atteint pas les fichiers.
- `chmod -R 777` pour « débloquer » : tout le monde peut tout modifier, et le vrai problème n'est pas compris.
- Un dossier d'équipe sans setgid ou avec un umask `022` : les fichiers des uns ne sont pas modifiables par les autres.
- Supprimer un compte sans traiter ses fichiers hors de son dossier personnel.
- Une règle sudo avec un joker, ou qui autorise un programme capable de lancer un shell.

## Pour aller plus loin

- `man 5 passwd`, `man useradd`, `man chmod`, `man 5 sudoers` (section « Command specification »)
- [Ubuntu Server — gestion des utilisateurs](https://documentation.ubuntu.com/server/how-to/security/user-management/)
- [GTFOBins — programmes qui permettent de s'évader de sudo](https://gtfobins.github.io/)

Réponds maintenant aux questions de compréhension ci-dessous pour débloquer les exercices.
