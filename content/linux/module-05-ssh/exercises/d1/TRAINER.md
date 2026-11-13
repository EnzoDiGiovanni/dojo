# Bugs volontaires

1. `/etc/ssh/sshd_config.d/10-acces.conf` : `AllowUsers ubuntu depoly` (faute de frappe). Journal : « User deploy from … not allowed because not listed in AllowUsers ». Correction : `deploy`.
2. `/home/deploy` en `775` : StrictModes refuse les clés. Journal : « Authentication refused: bad ownership or modes for directory /home/deploy ». Correction : `chmod 755` (ou `750`). Mauvaise correction à refuser : `StrictModes no` (critère dédié).
3. La clé de la CI est coupée sur plusieurs lignes dans `authorized_keys` (fold à 64 colonnes, typique d'un copier-coller depuis un ticket). Aucune ligne n'est une clé valide ; le journal ne dit rien de plus que l'échec. Correction : remettre la clé sur une seule ligne (la clé publique est dans `cles/deploy.pub` du dossier de l'exercice).
4. `50-cloud-init.conf` (`PasswordAuthentication yes`) est lu avant `60-durcissement.conf` (`no`) : la première valeur l'emporte, le serveur accepte les mots de passe. `sshd -T | grep passwordauth` le montre. Correction : renommer le fichier de durcissement (`01-…`) ou corriger `50-cloud-init.conf`.

Les bugs 1, 2 et 3 masquent chacun le suivant : chaque correction fait apparaître un autre message (ou aucun) dans le journal.
