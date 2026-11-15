# Validation — la cuisine du traiteur

## Contexte

Le service traiteur de La Fabrique s'installe sur ce serveur. Pas d'indice ici : c'est toi seul. Une fois les critères remplis, tu devras justifier tes choix.

## Objectif

1. Crée les comptes `paul` et `ines` (dossier personnel, shell `/bin/bash`), cuisiniers, membres d'un nouveau groupe `cuisine`.
2. `/srv/cuisine/recettes` devient le dossier de travail de la cuisine : tout ce que paul ou ines y crée appartient au groupe `cuisine` et peut être modifié par l'autre, y compris la recette existante. Les autres utilisateurs n'y ont aucun accès.
3. Les factures de `/srv/cuisine/factures` doivent être lisibles par le groupe `compta` (lea) et par personne d'autre ; seul root peut les modifier.
4. Ines, cheffe de cuisine, doit pouvoir relancer le service `cron` avec `sudo systemctl restart cron`, sans mot de passe, et rien d'autre en root.
5. Le compte `ancien` (l'ancien chef) ne doit plus pouvoir s'authentifier par mot de passe, mais il ne doit pas être supprimé.

## Contraintes

- Ne modifie pas `/etc/sudoers`.
- Pas de `777` où que ce soit.

## Critères de réussite

- `paul` et `ines` existent avec un dossier personnel et le shell bash, et sont membres de `cuisine`
- Dans `recettes`, ce que crée `paul` ou `ines` appartient au groupe `cuisine` et est modifiable par l'autre, comme la recette existante
- Les utilisateurs hors de `cuisine` n'ont aucun accès à `recettes`
- Les factures sont lisibles par `lea` et par personne d'autre hors root, et seul root peut les modifier
- `ines` peut redémarrer cron avec sudo sans mot de passe, et ne peut rien lancer d'autre en root
- Le mot de passe de `ancien` est verrouillé
