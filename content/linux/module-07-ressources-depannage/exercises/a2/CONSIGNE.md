# Plus de place, vraiment ?

## Contexte

Les clients de la boutique de La Fabrique ne peuvent plus se connecter : leur panier se vide à chaque page. Le service `boutique-sessions` enregistre une session par visiteur, sous forme de petit fichier dans `/var/spool/sessions`. Le développeur a vérifié : « `df -h` dit qu'il reste plein de place, ce n'est pas le disque ».

## Objectif

1. Remets la boutique en état de créer des sessions, en supprimant les sessions de **plus d'un jour** (expirées), et seulement celles-là.
2. Fais en sorte que les sessions de plus d'un jour soient supprimées automatiquement à l'avenir, avec **systemd-tmpfiles**.

## Contraintes

- Ne redémarre pas le serveur : sur ce labo, `/var/spool/sessions` est un disque en mémoire, il serait reconstruit à l'identique.
- Ne modifie pas le service `boutique-sessions`.

## Critères de réussite

- La boutique peut de nouveau créer des sessions
- Moins de la moitié des inodes de `/var/spool/sessions` sont utilisés
- Les sessions de moins d'un jour sont toujours là
- Une règle systemd-tmpfiles nettoie les sessions de plus d'un jour, sans toucher aux sessions récentes

## Comment tester

`journalctl -u boutique-sessions -n 5`, `df -h` et `df -i` sur `/var/spool/sessions`. La vérification applique ta règle avec `systemd-tmpfiles --clean`.
