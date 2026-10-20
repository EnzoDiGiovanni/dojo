import type { CheckContext, Criterion } from '#check'
import { buildImage, cacheSurvivesEdit, fail, findInImage, pass, probeAnswers, stopsCleanly } from '../../../helpers.ts'

const build = (ctx: CheckContext) => buildImage(ctx, 'm2-v1')

export default [
  {
    id: 'build',
    label: 'Le Dockerfile se construit et l\'image embarque Python 3.13',
    async run(ctx) {
      const built = await build(ctx)
      if (!built.ok) return built.failure!
      const r = await ctx.runOnce(built.image, ['--version'], { entrypoint: 'python' })
      const version = (r.stdout + r.stderr).trim()
      return version.startsWith('Python 3.13') ? pass(version) : fail(`Version trouvée : ${version || 'python introuvable'}.`)
    },
  },
  {
    id: 'default',
    label: 'Sans argument, le conteneur répond `Bonjour` sur son port 8000',
    async run(ctx) {
      const built = await build(ctx)
      if (!built.ok) return built.failure!
      return probeAnswers(ctx, built.image, { containerPort: 8000, contains: 'Bonjour depuis dojo-m2-v1' })
    },
  },
  {
    id: 'args',
    label: 'Avec les arguments `--greeting Salut`, le conteneur répond `Salut`',
    async run(ctx) {
      const built = await build(ctx)
      if (!built.ok) return built.failure!
      return probeAnswers(ctx, built.image, { containerPort: 8000, args: ['--greeting', 'Salut'], contains: 'Salut depuis dojo-m2-v1' })
    },
  },
  {
    id: 'env',
    label: 'L\'image définit `APP_ENV=production` par défaut',
    async run(ctx) {
      const built = await build(ctx)
      if (!built.ok) return built.failure!
      const env: string[] = (await ctx.inspectImage(built.image))?.Config?.Env ?? []
      const value = env.find((e) => e.startsWith('APP_ENV='))
      return value === 'APP_ENV=production' ? pass() : fail(value ? `Valeur trouvée : ${value}.` : 'APP_ENV n\'est pas défini dans l\'image.')
    },
  },
  {
    id: 'cache',
    label: 'Après une modification de `app.py` seul, l\'étape `pip install` est servie par le cache',
    run: (ctx) => cacheSurvivesEdit(ctx, { tag: 'm2-v1', file: 'app.py', comment: '#', step: /pip3? install/, stepName: 'pip install' }),
  },
  {
    id: 'no-leak',
    label: 'L\'image ne contient ni `.env` ni `test_app.py`',
    async run(ctx) {
      const built = await build(ctx)
      if (!built.ok) return built.failure!
      const found = await findInImage(ctx, built.image, ['.env', 'test_app.py'])
      return found.length === 0 ? pass() : fail(`Trouvé dans l'image : ${found.join(', ')}.`)
    },
  },
  {
    id: 'stop',
    label: '`docker stop` arrête le conteneur en moins de 3 secondes, avec le code de sortie 0',
    async run(ctx) {
      const built = await build(ctx)
      if (!built.ok) return built.failure!
      return stopsCleanly(ctx, built.image, { containerPort: 8000 })
    },
  },
] satisfies Criterion[]
