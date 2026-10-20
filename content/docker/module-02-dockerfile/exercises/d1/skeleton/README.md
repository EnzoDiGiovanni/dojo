# dojo-notes

Petit service de notes interne de la Boulangerie Dojo.

- Écoute sur le port **3000** du conteneur.
- `GET /notes` renvoie la liste des notes en JSON.
- La configuration sensible est dans `.env` (local uniquement).

```bash
docker build -t dojo-notes .
docker run --rm -p 3000:3000 dojo-notes
```
