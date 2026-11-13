# Le service de réservation

## Contexte

Un prestataire a livré le service de réservation des ateliers de La Fabrique : le code dans `/opt/reservation`, sa configuration dans `/etc/reservation/`, et l'unit `/etc/systemd/system/reservation.service`. « Il n'y a plus qu'à le démarrer », a-t-il écrit avant de disparaître. Il ne démarre pas.

L'application répond sur le port 8200 du serveur : `GET /` liste les réservations, `POST /?nom=…` en enregistre une.

## Objectif

Fais tourner le service correctement et durablement.

## Contraintes

- Ne modifie pas `app.py`.
- Le service tourne avec le compte `reservation`, jamais root.
- Il y a plusieurs problèmes, qui n'apparaissent pas tous en même temps : lis les messages de systemd à chaque étape.

## Critères de réussite

- `reservation` est actif et répond sur le port 8200 du serveur
- Une réservation enregistrée est toujours là après un redémarrage du service
- Le service tourne avec le compte `reservation`
- Après un redémarrage du serveur, le service est de nouveau actif sans intervention

## Comment tester

`sudo systemctl start reservation`, `systemctl status reservation`, `journalctl -u reservation`. Puis, sur le serveur : `curl http://127.0.0.1:8200/` et `curl -X POST 'http://127.0.0.1:8200/?nom=essai'`.
