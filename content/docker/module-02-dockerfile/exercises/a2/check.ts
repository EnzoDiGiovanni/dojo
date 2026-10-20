import type { Criterion } from '#check'
import { buildImage, cacheSurvivesEdit, fail, pass, probeAnswers } from '../../../helpers.ts'

export default [
  {
    id: 'build',
    label: 'Le Dockerfile du dossier se construit sans erreur',
    async run(ctx) {
      const built = await buildImage(ctx, 'm2-a2')
      return built.ok ? pass() : built.failure!
    },
  },
  {
    id: 'cache',
    label: 'Après une modification de `server.js` seul, l\'étape `npm ci` est servie par le cache',
    run: (ctx) => cacheSurvivesEdit(ctx, { tag: 'm2-a2', file: 'server.js', comment: '//', step: /npm (ci|install)/, stepName: 'npm ci' }),
  },
  {
    id: 'serve',
    label: 'L\'image construite démarre et répond sur le port 3000 du conteneur',
    async run(ctx) {
      const built = await buildImage(ctx, 'm2-a2')
      if (!built.ok) return fail('Le build échoue.')
      return probeAnswers(ctx, built.image, { containerPort: 3000, contains: 'dojo-m2-a2' })
    },
  },
] satisfies Criterion[]
