import type { Criterion } from '#check'
import { contextBytes, fail, findInImage, formatBytes, pass, probeAnswers } from '../../../helpers.ts'

const IMAGE = 'dojo/m2-i1:1.0'
const missing = fail('Aucune image dojo/m2-i1:1.0 sur ta machine.')

export default [
  {
    id: 'serve',
    label: 'Un conteneur lancé depuis `dojo/m2-i1:1.0` sans argument répond sur son port 3000',
    async run(ctx) {
      if (!(await ctx.inspectImage(IMAGE))) return missing
      return probeAnswers(ctx, IMAGE, { containerPort: 3000, contains: 'dojo-m2-i1' })
    },
  },
  {
    id: 'expose',
    label: 'L\'image documente le port 3000',
    async run(ctx) {
      const image = await ctx.inspectImage(IMAGE)
      if (!image) return missing
      const ports = Object.keys(image.Config.ExposedPorts ?? {})
      return ports.includes('3000/tcp') ? pass() : fail(`Ports documentés : ${ports.join(', ') || 'aucun'}.`)
    },
  },
  {
    id: 'node-env',
    label: 'L\'image définit `NODE_ENV=production` par défaut',
    async run(ctx) {
      const image = await ctx.inspectImage(IMAGE)
      if (!image) return missing
      const env: string[] = image.Config.Env ?? []
      const value = env.find((e) => e.startsWith('NODE_ENV='))
      return value === 'NODE_ENV=production' ? pass() : fail(value ? `Valeur trouvée : ${value}.` : 'NODE_ENV n\'est pas défini dans l\'image.')
    },
  },
  {
    id: 'no-env',
    label: 'L\'image ne contient aucun fichier `.env`',
    async run(ctx) {
      if (!(await ctx.inspectImage(IMAGE))) return missing
      const found = await findInImage(ctx, IMAGE, ['.env'])
      return found.length === 0 ? pass() : fail(`Trouvé dans l'image : ${found.join(', ')}.`)
    },
  },
  {
    id: 'no-logs-tests',
    label: 'L\'image ne contient ni les logs (`app.log`) ni les tests (`server.test.js`)',
    async run(ctx) {
      if (!(await ctx.inspectImage(IMAGE))) return missing
      const found = await findInImage(ctx, IMAGE, ['app.log', 'server.test.js'])
      return found.length === 0 ? pass() : fail(`Trouvé dans l'image : ${found.join(', ')}.`)
    },
  },
  {
    id: 'context',
    label: 'Le contexte de build fait moins de 50 ko',
    async run(ctx) {
      const size = await contextBytes(ctx)
      if (typeof size !== 'number') return size
      return size < 50_000 ? pass(`Contexte mesuré : ${formatBytes(size)}.`) : fail(`Contexte mesuré : ${formatBytes(size)}.`)
    },
  },
] satisfies Criterion[]
