import type { CheckContext, Criterion } from '#check'
import { containerRunning, fail, httpAnswers, pass } from '../../../helpers.ts'

const IMAGE = 'nginx:alpine'

async function compare(ctx: CheckContext, key: string, expected: (image: any) => string) {
  const answers = await ctx.readEnvFile('reponses.env')
  if (!answers) return fail('Fichier reponses.env absent.')
  if (!answers[key]) return fail(`Clé ${key} absente de reponses.env.`)
  const image = await ctx.inspectImage(IMAGE)
  if (!image) return fail(`Image ${IMAGE} absente de ta machine.`)
  const normalize = (v: string) => v.replace(/\s+/g, ' ').trim()
  return normalize(answers[key]) === normalize(expected(image)) ? pass() : fail(`${key}=${answers[key]} ne correspond pas.`)
}

export default [
  {
    id: 'layers',
    label: '`LAYERS` correspond au nombre de couches de `nginx:alpine`',
    run: (ctx) => compare(ctx, 'LAYERS', (img) => String(img.RootFS.Layers.length)),
  },
  {
    id: 'cmd',
    label: '`CMD` correspond à la commande par défaut de `nginx:alpine`',
    run: (ctx) => compare(ctx, 'CMD', (img) => img.Config.Cmd.join(' ')),
  },
  {
    id: 'stop-signal',
    label: '`STOP_SIGNAL` correspond au signal d\'arrêt de `nginx:alpine`',
    run: (ctx) => compare(ctx, 'STOP_SIGNAL', (img) => img.Config.StopSignal ?? 'SIGTERM'),
  },
  {
    id: 'custom',
    label: '`dojo-m1-i2` sert sur le port 47103 une page contenant `dojo`, sans aucun montage',
    async run(ctx) {
      const running = await containerRunning(ctx, 'dojo-m1-i2', IMAGE)
      if (!running.ok) return running
      const info = await ctx.inspectContainer('dojo-m1-i2')
      if (info.Mounts.length > 0) return fail(`${info.Mounts.length} montage(s) détecté(s) sur le conteneur.`)
      return httpAnswers(ctx, 'http://127.0.0.1:47103', { contains: 'dojo' })
    },
  },
  {
    id: 'original',
    label: '`dojo-m1-i2-b` sert sur le port 47104 la page d\'accueil d\'origine de nginx',
    async run(ctx) {
      const running = await containerRunning(ctx, 'dojo-m1-i2-b', IMAGE)
      if (!running.ok) return running
      return httpAnswers(ctx, 'http://127.0.0.1:47104', { contains: 'Welcome to nginx!' })
    },
  },
] satisfies Criterion[]
