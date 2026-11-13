# APT ne veut plus rien installer

## Contexte

Sur le serveur de supervision de La Fabrique, plus rien ne s'installe. L'ancien administrateur a laissé ce mot :

> J'ai voulu installer notre agent de métriques (`fabrique-agent`, le .deb est dans /var/cache) et `jq`. Depuis, apt hurle à chaque commande. J'ai tenté `apt --fix-broken install` plusieurs fois, ça ne change rien. Bon courage.

## Objectif

Remets APT en état, puis installe `jq` et termine l'installation de `fabrique-agent`.

## Contraintes

- Le serveur a besoin d'Internet.
- Les dépôts officiels d'Ubuntu, mises à jour de sécurité comprises, doivent rester déclarés et vérifiés.
- Ne contourne rien (`trusted=yes`, `--force-…`, édition de `/var/lib/dpkg/status`) : trouve les causes.
- Il y a plusieurs problèmes : lis chaque message, corrige, relance.

## Critères de réussite

- `apt update` se termine sans erreur ni avertissement
- Aucun paquet n'est dans un état incohérent
- `jq` est installé et fonctionne
- `fabrique-agent` est installé et configuré, et envoie ses métriques au collecteur de La Fabrique
- Les mises à jour de sécurité d'Ubuntu sont toujours disponibles, depuis des dépôts vérifiés

## Comment tester

`sudo apt update`, `sudo apt install jq`, `dpkg --audit`, `fabrique-agent`.
