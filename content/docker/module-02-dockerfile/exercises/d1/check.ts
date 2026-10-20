import type { Criterion } from '#check'
import { buildImage, cacheSurvivesEdit, fail, findInImage, pass, probeAnswers, stopsCleanly } from '../../../helpers.ts'

export default [
  {
    id: 'serve',
    label: 'L\'image se construit et répond à `GET /notes` sur le port 3000 du conteneur',
    async run(ctx) {
      const built = await buildImage(ctx, 'm2-d1')
      if (!built.ok) return built.failure!
      return probeAnswers(ctx, built.image, { containerPort: 3000, path: '/notes', contains: 'farine' })
    },
  },
  {
    id: 'cache',
    label: 'Après une modification de `server.js` seul, l\'étape `npm ci` est servie par le cache',
    run: (ctx) => cacheSurvivesEdit(ctx, { tag: 'm2-d1', file: 'server.js', comment: '//', step: /npm (ci|install)/, stepName: 'npm ci' }),
  },
  {
    id: 'no-env',
    label: 'L\'image ne contient aucun fichier `.env`',
    async run(ctx) {
      const built = await buildImage(ctx, 'm2-d1')
      if (!built.ok) return built.failure!
      const found = await findInImage(ctx, built.image, ['.env'])
      return found.length === 0 ? pass() : fail(`Trouvé dans l'image : ${found.join(', ')}.`)
    },
  },
  {
    id: 'stop',
    label: '`docker stop` arrête le conteneur en moins de 3 secondes, avec le code de sortie 0',
    async run(ctx) {
      const built = await buildImage(ctx, 'm2-d1')
      if (!built.ok) return built.failure!
      return stopsCleanly(ctx, built.image, { containerPort: 3000 })
    },
  },
] satisfies Criterion[]
