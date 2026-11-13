# Validation — le mailer du partenaire

## Contexte

La Fabrique confie l'envoi de ses newsletters à un partenaire, qui fournit le logiciel `partenaire-mailer` dans son propre dépôt APT : disponible sur ton serveur dans `/srv/depot-partenaire`, avec sa clé et un LISEZMOI dans `/home/ubuntu/livraisons/`.

Pas d'indice ici : c'est toi seul. Une fois les critères remplis, tu devras justifier tes choix.

## Objectif

1. Installe `partenaire-mailer` depuis le dépôt du partenaire, en vérifiant ses signatures avec sa clé, et avec elle seule. Son service démarre à l'installation.
2. Retiens-le à sa version actuelle : le partenaire a cassé la compatibilité deux fois l'an dernier.
3. Au premier démarrage, le service s'est arrêté en erreur avant de repartir. Écris `/home/ubuntu/incident.txt` avec deux lignes tirées du journal :
   ```
   relais=<le relais SMTP que le mailer n'a pas pu joindre, tel qu'écrit dans son message d'erreur>
   code=<le code de sortie de ce premier arrêt>
   ```
4. Le mailer écrit `/var/log/mailer/mailer.log` sans jamais le faire tourner, et rouvre son journal quand il reçoit le signal HUP. Écris `/etc/logrotate.d/mailer` : rotation **chaque semaine**, **8** anciens journaux gardés, **compressés**, et le mailer écrit dans un journal neuf après chaque rotation, sans être redémarré.

## Contraintes

- Le serveur a besoin d'Internet (dépendances depuis les dépôts Ubuntu).
- Ne modifie ni le dépôt du partenaire ni les fichiers installés par son paquet.

## Critères de réussite

- `partenaire-mailer` est installé depuis son dépôt, déclaré avec sa clé en `signed-by` et sans désactiver la vérification, et son service tourne
- La clé du partenaire n'est pas approuvée pour les autres dépôts
- `partenaire-mailer` ne changera pas de version lors des mises à jour
- `incident.txt` donne le relais SMTP injoignable et le code de sortie du premier arrêt du service
- Les journaux de `/var/log/mailer` tournent chaque semaine, 8 anciens sont gardés compressés, et le mailer écrit dans un journal neuf après une rotation
