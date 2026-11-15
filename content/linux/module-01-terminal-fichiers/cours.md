# Module 1 — Terminal et système de fichiers

## Objectifs

À la fin de ce module, tu sais :

- dire où Linux range ses fichiers et pourquoi, et t'y déplacer sans te perdre ;
- créer, copier, déplacer, archiver et lier des fichiers sans rien perdre en route ;
- retrouver des fichiers par nom, âge, taille ou type, et agir dessus sans risque ;
- extraire une information d'un fichier texte en chaînant des commandes.

## 0. Ton serveur de labo

Chaque exercice de ce parcours te fournit **son propre serveur** Ubuntu 24.04, tel qu'un hébergeur te livre un VPS : pas d'interface graphique, un compte `ubuntu` qui peut utiliser `sudo`, systemd, SSH, cron. Ce serveur tourne sur ta machine dans un conteneur, mais tu l'administres comme une vraie machine.

```bash
sh vps.sh            # démarre le serveur de l'exercice (le crée la première fois)
sh vps.sh console    # ouvre un terminal sur le serveur
sh vps.sh reset      # repart d'un serveur neuf (ton travail sur le serveur est perdu)
```

Le dossier `lab/` décrit comment l'hébergeur fabrique la machine. Ce n'est pas ton travail, et le lire te gâcherait les diagnostics : fais comme avec un vrai VPS, observe la machine de l'intérieur. La vérification inspecte le serveur lui-même.

## 1. L'arborescence

Sous Linux, il n'y a **qu'un seul arbre**, qui part de `/` (la racine). Les disques, les clés USB, les partages réseau sont *montés* quelque part dans cet arbre ; il n'y a pas de `C:` ni de `D:`. Le rangement suit une convention, le FHS :

| Chemin | Contenu |
|---|---|
| `/etc` | configuration du système et des services (texte, éditable) |
| `/var` | données qui **varient** : `/var/log` (journaux), `/var/lib` (état des services, bases), `/var/cache`, `/var/spool` |
| `/home/<nom>` | dossiers personnels des utilisateurs ; `/root` pour root |
| `/srv` | données servies par ce serveur (sites, dépôts) — c'est à toi de l'organiser |
| `/opt` | logiciels installés hors du gestionnaire de paquets |
| `/usr` | programmes et bibliothèques du système (`/usr/bin`, `/usr/lib`), en lecture seule en usage normal |
| `/usr/local` | ce que *tu* installes à la main pour cette machine (`/usr/local/bin` pour tes scripts) |
| `/tmp` | fichiers temporaires, vidé au redémarrage |
| `/proc`, `/sys` | fichiers virtuels exposés par le noyau (processus, matériel) : rien n'y est stocké sur disque |
| `/dev` | périphériques sous forme de fichiers |

Règle pratique : avant de chercher « où est la config de X », pense `/etc/X*` ; « où sont ses logs », pense `/var/log/X*` ; « où sont ses données », pense `/var/lib/X`.

## 2. Se déplacer : chemins absolus et relatifs

Un chemin **absolu** commence par `/` et ne dépend pas de l'endroit où tu es. Un chemin **relatif** part du répertoire courant (`pwd`). `.` désigne le répertoire courant, `..` son parent, `~` ton dossier personnel.

```bash
cd /etc/apt          # absolu
cd ../ssh            # relatif : on remonte dans /etc puis on descend dans ssh → /etc/ssh
cd ~                 # ou `cd` tout court
cd -                 # revient au répertoire précédent
ls -la               # liste détaillée, fichiers cachés compris
```

Un fichier dont le nom commence par `.` est **caché** : `ls` ne l'affiche pas sans `-a`, et le joker `*` du shell ne le désigne pas. Retiens bien cette dernière règle, elle explique beaucoup de copies incomplètes.

## 3. Manipuler des fichiers

```bash
mkdir -p /srv/wiki/data/pages        # crée toute la chaîne, sans erreur si elle existe déjà
cp fichier.conf fichier.conf.orig    # copie
cp -a /srv/wiki/data /srv/wiki/data.save   # -a : récursif, en conservant droits, dates, liens
mv brouillon.md pages/accueil.md     # déplacer ou renommer : c'est la même opération
rm fichier ; rm -r dossier           # supprimer, sans corbeille ni retour arrière
```

Copier **le contenu** d'un dossier, fichiers cachés compris : `cp -a source/. destination/`. Le `source/*` paraît équivalent mais oublie tout ce qui commence par un point.

Les noms de fichiers peuvent contenir des espaces. Le shell découpe les arguments sur les espaces : entoure toujours un chemin variable de guillemets (`"$fichier"`), sinon `mon rapport.pdf` devient deux arguments.

## 4. Liens

Un **lien symbolique** est un petit fichier qui contient un chemin vers une autre cible. Si la cible disparaît, le lien est cassé.

```bash
ln -s /srv/wiki/versions/2024-06 /srv/wiki/actuel   # actuel → versions/2024-06
readlink -f /srv/wiki/actuel                          # vers quoi pointe-t-il, en chemin absolu ?
ls -l /srv/wiki                                       # la flèche → montre la cible
```

Un lien relatif (`ln -s versions/2024-06 actuel`) est résolu **depuis le dossier qui contient le lien**, pas depuis l'endroit où tu as tapé la commande.

Piège classique : `ln -s cible lien` quand `lien` existe déjà et pointe vers un **dossier**. `ln` considère alors `lien` comme le dossier de destination et crée le nouveau lien *à l'intérieur*. Pour remplacer un lien existant, il faut lui dire de traiter le lien comme un fichier ordinaire : regarde `man ln` du côté de `-n` et `-T`. C'est le mécanisme qu'utilisent la plupart des outils de déploiement pour basculer d'une version à l'autre.

Un **lien physique** (`ln` sans `-s`) est un second nom pour le même contenu sur le disque ; tu en croiseras peu en administration.

## 5. Archives

```bash
tar -czf wiki-2024-06.tar.gz -C /srv/wiki data    # c : créer, z : gzip, f : fichier ; -C : se placer dans /srv/wiki d'abord
tar -tzf wiki-2024-06.tar.gz                      # t : lister sans extraire — toujours avant d'extraire une archive inconnue
tar -xzf wiki-2024-06.tar.gz -C /tmp/restau       # x : extraire, dans le dossier donné
```

Les chemins **stockés** dans l'archive dépendent de la façon dont tu l'as créée : avec `-C /srv/wiki data`, l'archive contient `data/...` ; avec `tar -czf x.tgz /srv/wiki/data`, elle contient `srv/wiki/data/...`. Liste toujours une archive avant de l'extraire : beaucoup d'archives ont un dossier de premier niveau (`projet-1.2/…`). L'option `--strip-components=N` retire les N premiers niveaux à l'extraction.

## 6. Retrouver des fichiers : find

`find` parcourt une arborescence et applique des tests à chaque entrée :

```bash
find /var/lib/wiki -name '*.lock'            # par nom (joker entre guillemets, sinon le shell l'interprète)
find /var/lib/wiki -type f -name '*.lock'    # seulement les fichiers ordinaires (-type d : dossiers)
find /home -mtime +90                        # modifiés il y a plus de 90 jours (-mtime -2 : moins de 2 jours)
find /srv -size +200M                        # plus de 200 Mio
find /srv -user deploy -newer /etc/hostname  # combinaisons : tous les tests doivent être vrais
```

Agir sur le résultat :

```bash
find /var/lib/wiki -type f -name '*.lock' -print     # TOUJOURS d'abord : regarder ce qui sera touché
find /var/lib/wiki -type f -name '*.lock' -delete
find /srv/wiki -name '*.pdf' -exec mv -t /srv/pdf {} +
```

`-exec … {} +` passe les fichiers trouvés en arguments, espaces compris, sans les découper. C'est plus sûr qu'un `for f in $(find …)`, qui casse les noms à chaque espace.

Attention à ce que tu supprimes : `-name '*.lock'` désigne aussi des **dossiers** nommés `x.lock`, et un `rm -r` sur un tel dossier emporte tout son contenu, récent ou non.

## 7. Le texte et les pipes

Presque tout est texte sous Linux : configurations, journaux, sorties de commandes. On les traite en enchaînant de petits outils.

| Outil | Rôle | Exemple |
|---|---|---|
| `grep` | garder les lignes qui correspondent | `grep -i 'error' app.log`, `grep -v '^#' fichier.conf` |
| `cut` | découper en colonnes sur un séparateur | `cut -d: -f1 /etc/passwd` |
| `awk` | traiter des colonnes séparées par des blancs | `awk '{print $1, $7}' app.log` |
| `sort` | trier (`-n` numérique, `-r` inverse, `-k2` sur une colonne) | `sort -nr` |
| `uniq -c` | compter les lignes identiques **consécutives** | d'où le `sort` juste avant |
| `wc -l` | compter les lignes | |
| `head` / `tail` | début / fin (`tail -f` : suivre en direct) | `head -n 5` |

Le **pipe** `|` envoie la sortie d'une commande dans l'entrée de la suivante. Les **redirections** envoient une sortie vers un fichier : `>` écrase, `>>` ajoute, `2>` redirige les erreurs, `2>&1` envoie les erreurs au même endroit que la sortie.

```bash
# Les 3 shells les plus utilisés par les comptes du système
cut -d: -f7 /etc/passwd | sort | uniq -c | sort -nr | head -n 3
```

Méthode : construis le pipeline **une étape à la fois**, en regardant la sortie à chaque ajout. Et vérifie que tu filtres sur la bonne colonne : chercher ` 404 ` dans tout un journal web trouve aussi les lignes dont un *autre* champ vaut 404 (une taille de réponse, par exemple).

Le format de journal le plus courant des serveurs web (format « combined ») ressemble à ceci :

```
203.0.113.7 - - [12/Mar/2024:10:01:22 +0100] "GET /wiki/Accueil?lang=fr HTTP/1.1" 200 5120 "-" "Mozilla/5.0"
```

Les champs séparés par des blancs : 1 = adresse du client, 6-8 = la requête (méthode, chemin, protocole), 9 = code de statut, 10 = taille de la réponse.

## Pièges courants

- `*` n'inclut pas les fichiers cachés : une copie avec `*` est souvent incomplète.
- `ln -s` sur un lien qui pointe déjà vers un dossier crée un lien *dans* ce dossier au lieu de le remplacer.
- Un chemin sans guillemets casse au premier espace.
- `find … -delete` sans avoir regardé la liste d'abord, ou un `-name` qui attrape aussi des dossiers.
- `uniq` sans `sort` avant : il ne regroupe que les lignes consécutives.
- `sort` sans `-n` trie des nombres comme du texte (`10` avant `9`), et sans `-V` trie des numéros de version comme du texte (`2.10` avant `2.9`).
- Un `grep` sur toute la ligne quand l'information est dans une colonne précise.

## Pour aller plus loin

- `man hier` (la description de l'arborescence sur ton serveur), `man find`, `man tar`
- [GNU Coreutils — manuel](https://www.gnu.org/software/coreutils/manual/coreutils.html)
- [The Linux Command Line (William Shotts), en ligne et gratuit](https://linuxcommand.org/tlcl.php)

Réponds maintenant aux questions de compréhension ci-dessous pour débloquer les exercices.
