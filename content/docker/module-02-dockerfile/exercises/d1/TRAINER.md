# Bugs volontaires

1. `ENV PORT=8080` alors que le README et `EXPOSE` annoncent 3000 : le serveur écoute sur 8080, rien ne répond sur 3000. Correction : `PORT=3000` ou supprimer la ligne.
2. `COPY . .` avant `RUN npm ci` : toute modification de code rejoue l'installation. Correction : copier `package.json` et `package-lock.json`, installer, puis copier le reste.
3. Pas de `.dockerignore` : `.env` (et `node_modules` de l'hôte s'il existe) part dans le contexte et dans l'image. Correction : `.dockerignore` avec au moins `.env`, `node_modules`.
4. `docker-entrypoint.sh` lance `node server.js` sans `exec` : `sh` reste PID 1 et ne transmet pas SIGTERM, arrêt en 10 s avec le code 137. Correction : `exec node server.js`.
