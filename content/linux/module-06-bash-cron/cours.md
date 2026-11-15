# Module 6 — Scripts Bash et tâches planifiées

## Objectifs

À la fin de ce module, tu sais :

- écrire un script Bash qui vérifie ce qu'on lui donne, signale ses erreurs et ne casse rien quand un nom contient un espace ;
- planifier une tâche avec cron, et comprendre pourquoi un script qui marche à la main échoue dans cron ;
- écrire un script d'exploitation qu'on peut relancer sans crainte : idempotent, protégé contre les exécutions simultanées, journalisé.

## 1. Le squelette d'un script

```bash
#!/bin/bash
# purge-miniatures : supprime les miniatures plus vieilles que N jours.
set -euo pipefail

usage() {
  echo "usage : $(basename "$0") <jours>" >&2
  exit 2
}

[ $# -eq 1 ] || usage
jours=$1
[[ $jours =~ ^[0-9]+$ ]] || usage

find /srv/galerie/miniatures -type f -mtime +"$jours" -delete
echo "purge terminée (plus de $jours jours)"
```

- La première ligne (**shebang**) choisit l'interpréteur. Avec `chmod +x`, le script se lance par son chemin, ou par son nom s'il est dans un dossier du `PATH` (`/usr/local/bin`, `/usr/local/sbin` pour l'administration).
- `set -e` arrête le script à la première commande qui échoue ; `-u` fait une erreur de toute variable non définie ; `-o pipefail` fait échouer un pipeline si **une** de ses commandes échoue, pas seulement la dernière. Sans ces options, un script continue après une erreur et fait des dégâts « en cascade ».
- `$0` est le nom du script, `$1`, `$2`… ses arguments, `$#` leur nombre, `"$@"` tous les arguments, chacun préservé. `$?` est le code de retour de la dernière commande.
- Les messages d'erreur vont sur la **sortie d'erreur** (`>&2`), pas sur la sortie standard qu'un autre programme pourrait lire.

## 2. Codes de retour

Chaque commande renvoie un code : **0 = succès**, tout le reste = échec. C'est ce que testent `if`, `&&`, `||` et `set -e`. Un script choisit le sien avec `exit N`. Conventions utiles :

| Code | Usage courant |
|---|---|
| 0 | tout s'est bien passé |
| 1 | échec général |
| 2 | mauvaise utilisation (arguments) |
| 0 / 1 / 2 / 3 | dans les sondes de supervision : OK / avertissement / critique / inconnu |

```bash
if grep -q "^$utilisateur:" /etc/passwd; then echo "existe"; fi
mkdir -p "$dossier" || { echo "impossible de créer $dossier" >&2; exit 1; }
```

## 3. Variables, guillemets, tests, boucles, fonctions

```bash
nom="Mon rapport.pdf"
cp "$nom" /tmp/          # avec guillemets : un seul argument
cp $nom /tmp/            # sans : deux arguments, « Mon » et « rapport.pdf »
date_jour=$(date +%F)    # substitution de commande
total=$(( total + 1 ))   # arithmétique
```

**Mets des guillemets autour de toute variable**, sauf raison précise. C'est la première source de bugs des scripts d'administration.

```bash
if [ -d "$dossier" ]; then …; elif [ -z "$var" ]; then …; else …; fi
# -f fichier, -d dossier, -e existe, -z chaîne vide, -n non vide, = égal (chaînes), -eq -lt -ge (nombres)
[[ $nom =~ ^[a-z0-9-]+$ ]]     # [[ ]] de bash : expressions régulières, pas de découpage

for f in /srv/galerie/*.jpg; do echo "$f"; done
while IFS= read -r ligne; do echo "lu : $ligne"; done < fichier.txt   # lire un fichier ligne à ligne, espaces compris
while IFS=';' read -r login nom groupes; do …; done < comptes.csv     # découper chaque ligne sur ;

saluer() {            # une fonction : ses arguments sont $1, $2… ; return renvoie un code
  local qui=$1        # local : la variable n'existe que dans la fonction
  echo "bonjour $qui"
}
saluer "Léa"
```

`bash -n script` vérifie la syntaxe sans exécuter ; `bash -x script` affiche chaque commande avant de l'exécuter, c'est l'outil de débogage n° 1. `shellcheck` (paquet du même nom) signale la plupart des pièges.

## 4. Un script d'exploitation sérieux

Un script lancé chaque nuit doit pouvoir tourner sans toi. Quatre propriétés :

- **Idempotent** : le relancer donne le même résultat, sans erreur ni doublon. On vérifie avant d'agir (« le compte existe-t-il déjà ? ») plutôt que d'échouer.
- **Atomique autant que possible** : on fabrique le résultat à côté (fichier temporaire) puis on le met en place en une fois (`mv`), pour qu'un échec en cours de route ne laisse pas un fichier à moitié écrit passer pour bon. `trap 'rm -f "$tmp"' EXIT` nettoie quoi qu'il arrive.
- **Protégé contre lui-même** : si l'exécution précédente n'est pas finie, la suivante ne doit pas la percuter. `flock` pose un verrou sur un fichier :

  ```bash
  exec 9>/run/lock/purge-miniatures.lock
  flock -n 9 || { echo "déjà en cours" >&2; exit 1; }
  ```

- **Journalisé** : `logger -t purge-miniatures "42 fichiers supprimés"` écrit dans le journal système, consultable avec `journalctl -t purge-miniatures`.

Rotation : garder les N sauvegardes les plus récentes, c'est lister par date (`ls -1t`, ou des noms datés `AAAAMMJJ-HHMMSS` qui se trient naturellement), garder les N premières, supprimer les autres.

## 5. cron

cron lance des commandes selon un calendrier à cinq champs :

```
# ┌ minute (0-59)
# │  ┌ heure (0-23)
# │  │  ┌ jour du mois (1-31)
# │  │  │ ┌ mois (1-12 ou jan-dec)
# │  │  │ │ ┌ jour de la semaine (0-7, 0 et 7 = dimanche, ou sun-sat)
# │  │  │ │ │
  45 23 * * 1-5   commande       # 23 h 45, du lundi au vendredi
  */10 * * * *    commande       # toutes les 10 minutes
  0 6 1 * *       commande       # le 1er de chaque mois à 6 h
```

Deux endroits :

- la **crontab d'un utilisateur** : `crontab -e` (la sienne), `sudo crontab -u alice -e`, `crontab -l` pour la lire. Cinq champs puis la commande ;
- les fichiers **système** de `/etc/cron.d/` : un **sixième champ** donne le compte qui exécute la commande. Ces fichiers doivent appartenir à root, ne pas être modifiables par d'autres, avoir un nom sans point, et se **terminer par un saut de ligne** : cron ignore une dernière ligne non terminée.

**Pourquoi « ça marche à la main mais pas dans cron »** — cron lance la commande avec `/bin/sh`, dans le dossier personnel du compte, avec un environnement presque vide :

- `PATH=/usr/bin:/bin` : `/usr/local/bin`, `/usr/local/sbin`, `/usr/sbin` n'y sont pas. Utilise des chemins absolus, ou définis `PATH=` en tête du fichier ;
- aucune variable de ton `~/.bashrc` ou de ta session ;
- le caractère `%` a un sens spécial dans une ligne de cron (il coupe la commande et le reste devient l'entrée standard) : écris `\%`, par exemple `date +\%F` ;
- ce que la commande affiche est envoyé par courriel… à personne, sur un serveur sans messagerie. Redirige : `>> /var/log/purge.log 2>&1`.

Pour tester une tâche **comme cron la lancerait** : `sudo -u alice env -i HOME=/home/alice SHELL=/bin/sh PATH=/usr/bin:/bin /bin/sh -c 'la commande exacte'`. Le journal (`journalctl -u cron`) montre chaque lancement : `(alice) CMD (…)`.

Les timers systemd (module 3) sont l'alternative moderne ; cron reste partout, il faut savoir le lire et le diagnostiquer.

## Pièges courants

- Une variable sans guillemets, qui casse au premier espace ou s'évanouit si elle est vide.
- Oublier `set -euo pipefail`, et continuer après une erreur.
- Écrire les erreurs sur la sortie standard, et renvoyer 0 quand ça a échoué.
- Un script qui supprime d'abord et vérifie ensuite.
- Dans cron : `PATH` réduit, `%` non échappé, variables de `.bashrc` absentes, sortie non redirigée, dernière ligne sans saut de ligne.
- Un fichier de `/etc/cron.d/` modifiable par d'autres ou dont le nom contient un point : cron l'ignore.

## Pour aller plus loin

- [Bash Guide (Greg's Wiki)](https://mywiki.wooledge.org/BashGuide) et [BashPitfalls](https://mywiki.wooledge.org/BashPitfalls)
- [ShellCheck](https://www.shellcheck.net/)
- `man 5 crontab`, `man 8 cron`, `man flock`, `man logger`

Réponds maintenant aux questions de compréhension ci-dessous pour débloquer les exercices.
