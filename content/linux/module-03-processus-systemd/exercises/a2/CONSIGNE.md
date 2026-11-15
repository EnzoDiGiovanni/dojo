# Remettre de l'ordre dans les services

## Contexte

Trois services maison posent problème sur le serveur de La Fabrique :

- `rapport` génère les rapports clients. Il ne tourne pas, et il ne démarre jamais avec le serveur.
- `vitrine-sync` synchronise l'ancienne vitrine, abandonnée depuis septembre. Il tourne encore.
- `ancien-ftp`, l'ancien serveur FTP, ne doit plus jamais démarrer, même si quelqu'un tape `systemctl start ancien-ftp` par habitude. On garde ses fichiers pour l'instant.

## Objectif

Mets chaque service dans l'état demandé, maintenant **et** après un redémarrage du serveur.

## Contraintes

- Ne supprime aucun fichier d'unit et ne modifie pas leur contenu.
- Ne touche pas aux autres services du serveur.

## Critères de réussite

- `rapport` tourne, et est activé au démarrage du serveur
- `vitrine-sync` est arrêté, et rien ne le relance
- `ancien-ftp` ne peut plus être démarré, même à la main
- Après un redémarrage du serveur, `rapport` tourne et `vitrine-sync` reste arrêté

## Comment tester

`systemctl status`, `is-active`, `is-enabled`, `list-timers`. La vérification redémarre ton serveur (`docker restart`) pour le dernier critère : rien de ce que tu as fait ne sera perdu.
