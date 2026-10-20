import type { CheckContext, Criterion } from '#check'
import { buildImage, fail, pass, probeAnswers, probeHttp, stopsCleanly } from '../../../helpers.ts'

const withVersion = (ctx: CheckContext) => buildImage(ctx, 'm2-i2-v', { buildArgs: { VERSION: '4.2.0' } })

export default [
  {
    id: 'version-arg',
    label: 'Construite avec `--build-arg VERSION=4.2.0`, l\'image répond `4.2.0` sur `/version`',
    async run(ctx) {
      const built = await withVersion(ctx)
      if (!built.ok) return built.failure!
      return probeAnswers(ctx, built.image, { containerPort: 3000, path: '/version', exact: '4.2.0' })
    },
  },
  {
    id: 'banner',
    label: 'La bannière `dojo-m2-i2 v4.2.0` apparaît dans les logs au démarrage',
    async run(ctx) {
      const built = await withVersion(ctx)
      if (!built.ok) return built.failure!
      const { probe } = await probeHttp(ctx, built.image, { containerPort: 3000 })
      const logs = await probe.logs()
      return logs.includes('dojo-m2-i2 v4.2.0') ? pass() : fail(`Premières lignes des logs : « ${logs.trim().split('\n').slice(0, 2).join(' / ').slice(0, 120)} ».`)
    },
  },
  {
    id: 'version-default',
    label: 'Construite sans argument de build, l\'image répond `dev` sur `/version`',
    async run(ctx) {
      const built = await buildImage(ctx, 'm2-i2-d')
      if (!built.ok) return built.failure!
      return probeAnswers(ctx, built.image, { containerPort: 3000, path: '/version', exact: 'dev' })
    },
  },
  {
    id: 'motd-default',
    label: 'Sans argument, le serveur affiche `Bienvenue`',
    async run(ctx) {
      const built = await withVersion(ctx)
      if (!built.ok) return built.failure!
      return probeAnswers(ctx, built.image, { containerPort: 3000, exact: 'Bienvenue' })
    },
  },
  {
    id: 'motd-args',
    label: 'Avec les arguments `--motd Salut`, le serveur affiche `Salut`',
    async run(ctx) {
      const built = await withVersion(ctx)
      if (!built.ok) return built.failure!
      return probeAnswers(ctx, built.image, { containerPort: 3000, args: ['--motd', 'Salut'], exact: 'Salut' })
    },
  },
  {
    id: 'stop',
    label: '`docker stop` arrête le conteneur en moins de 3 secondes, avec le code de sortie 0',
    async run(ctx) {
      const built = await withVersion(ctx)
      if (!built.ok) return built.failure!
      return stopsCleanly(ctx, built.image, { containerPort: 3000 })
    },
  },
] satisfies Criterion[]
