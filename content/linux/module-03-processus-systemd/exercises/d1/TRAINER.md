# Bugs volontaires

Ils apparaissent l'un après l'autre : corriger le premier révèle le suivant.

1. `EnvironmentFile=/etc/reservation.env` alors que le fichier est `/etc/reservation/reservation.env`. Symptôme : « Failed to load environment files » dans `systemctl status` / `journalctl -u reservation`, le service ne démarre même pas.
2. `ExecStart=/usr/bin/python3 app.py` sans `WorkingDirectory` : le répertoire courant est `/`. Symptôme : « can't open file '//app.py' ». Mettre un chemin absolu à `app.py` ne suffit pas : l'application lit `messages/accueil.txt` en relatif (FileNotFoundError). Correction : `WorkingDirectory=/opt/reservation`.
3. `Type=forking` pour un serveur qui reste au premier plan : systemd attend une fin qui ne vient pas, puis échoue au bout de 15 s (« start operation timed out »). Correction : `Type=simple` (ou supprimer la ligne).
4. `/var/lib/reservation` appartient à root en `755` : les lectures fonctionnent, mais chaque réservation (POST) répond 500, et le journal montre « Permission denied ». Correction : `StateDirectory=reservation` (le plus propre) ou `chown reservation`.
5. Pas de section `[Install]` : `systemctl enable` répond que l'unit n'a pas de configuration d'installation. Le service ne revient pas après un redémarrage. Correction : `[Install]` / `WantedBy=multi-user.target`, puis `enable`.

À chaque étape, l'apprenant doit lire `systemctl status` et `journalctl -u reservation` : c'est l'objet du défi.
