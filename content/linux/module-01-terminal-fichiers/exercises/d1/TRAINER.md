# Bugs volontaires

1. `tar -xzf "$archive" -C "$dest"` sans `--strip-components=1` : l'archive contient un dossier `atelier-2.11/`, la version se retrouve dans `releases/2.11/atelier-2.11/`. Symptôme : `releases/2.11/index.html` n'existe pas.
2. `cp "$BASE"/shared/config/* …` : le joker ignore `.env`. Symptôme : la version déployée n'a que `app.ini` dans `config/`. Correction : `cp -a "$BASE/shared/config/." "$dest/config/"`.
3. `ln -sf` sur `current`, lien existant vers un dossier : le nouveau lien est créé dans `releases/2.10/` (sous le nom `2.11`), `current` ne bouge pas. Correction : `ln -sfn` (ou `-T`).
4. `ls releases | sort | head -n -3` : tri lexical, `2.10` < `2.11` < `2.8` < `2.9`. Le script supprime la 2.10 (la version précédente, celle du retour arrière) et garde la 2.8. Combiné au bug 3, `current` pointe vers un dossier supprimé : le site tombe. Correction : `sort -V`.

Effet de bord attendu : si l'apprenant lance le script tel quel sur `/srv/atelier`, la 2.10 disparaît. Il doit la réinstaller depuis `/home/ubuntu/livraisons/atelier-2.10.tar.gz` (sans basculer `current` dessus) : c'est le dernier critère. Bonne occasion de parler de tester un script de déploiement sur une copie (`ATELIER_DIR`) avant la production.
