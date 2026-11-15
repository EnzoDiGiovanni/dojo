# Ta première clé SSH

## Contexte

Le serveur de La Fabrique accepte les connexions SSH sur le port **47551** de ta machine (`127.0.0.1`). Le compte `deploy` servira aux déploiements : on veut s'y connecter par clé, jamais par mot de passe.

## Objectif

1. Sur **ta machine**, crée une paire de clés **ed25519** dans le dossier `cles/` de cet exercice : `cles/id_ed25519` et `cles/id_ed25519.pub`. Protège la clé privée par une phrase de passe.
2. Autorise cette clé pour le compte `deploy` du serveur. Tu passes par la console (`sh vps.sh console`) : copier-coller la clé publique fait partie de l'exercice.
3. Connecte-toi : `ssh -i cles/id_ed25519 -p 47551 deploy@127.0.0.1`.

## Contraintes

- La clé privée ne quitte jamais ta machine.
- N'utilise pas `ssh-copy-id` pour cet exercice : fais à la main ce qu'il fait.

## Critères de réussite

- `cles/` contient une paire de clés ed25519, et la clé privée n'est lisible que par toi
- La clé privée est protégée par une phrase de passe
- La clé publique est autorisée pour `deploy`, avec des droits que sshd accepte
- Une connexion au compte `deploy` avec cette clé apparaît dans les journaux du serveur

## Comment tester

La vérification ne se sert jamais de ta clé privée : elle cherche dans les journaux du serveur ta connexion réussie et l'empreinte de ta clé. Connecte-toi donc au moins une fois avant de vérifier.
