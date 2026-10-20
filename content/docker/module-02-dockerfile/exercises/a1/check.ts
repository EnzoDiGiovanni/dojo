import type { Criterion } from '#check'
import { containerRunning, fail, httpAnswers, pass } from '../../../helpers.ts'

const IMAGE = 'dojo/m2-a1:1.0'

export default [
  {
    id: 'image',
    label: 'L\'image `dojo/m2-a1:1.0` existe et est construite sur `node:22-alpine`',
    async run(ctx) {
      const image = await ctx.inspectImage(IMAGE)
      if (!image) return fail('Aucune image dojo/m2-a1:1.0 sur ta machine.')
      let base = await ctx.inspectImage('node:22-alpine')
      if (!base) {
        await ctx.docker(['pull', '-q', 'node:22-alpine'])
        base = await ctx.inspectImage('node:22-alpine')
      }
      const baseLayers: string[] = base?.RootFS?.Layers ?? []
      const layers: string[] = image.RootFS.Layers
      const onBase = baseLayers.length > 0 && baseLayers.every((l, i) => layers[i] === l)
      return onBase ? pass() : fail('Les couches de l\'image ne commencent pas par celles de node:22-alpine.')
    },
  },
  {
    id: 'workdir',
    label: 'L\'application est installée dans un répertoire de travail dédié, pas à la racine',
    async run(ctx) {
      const image = await ctx.inspectImage(IMAGE)
      if (!image) return fail('Aucune image dojo/m2-a1:1.0 sur ta machine.')
      const dir = image.Config.WorkingDir || '/'
      if (dir === '/') return fail('Répertoire de travail de l\'image : /')
      const r = await ctx.runOnce(IMAGE, ['-c', 'test -f server.js'], { entrypoint: 'sh' })
      return r.code === 0 ? pass(`Répertoire de travail : ${dir}`) : fail(`server.js est absent du répertoire de travail ${dir}.`)
    },
  },
  {
    id: 'default-cmd',
    label: 'L\'image démarre le serveur sans commande explicite',
    async run(ctx) {
      const image = await ctx.inspectImage(IMAGE)
      if (!image) return fail('Aucune image dojo/m2-a1:1.0 sur ta machine.')
      const start = [...(image.Config.Entrypoint ?? []), ...(image.Config.Cmd ?? [])].join(' ')
      return /server\.js|npm (run )?start/.test(start) ? pass() : fail(`Commande de démarrage de l'image : ${start || '(aucune)'}.`)
    },
  },
  {
    id: 'container',
    label: 'Le conteneur `dojo-m2-a1`, lancé depuis `dojo/m2-a1:1.0`, répond « Bonjour depuis dojo-m2 » sur http://127.0.0.1:47201',
    async run(ctx) {
      const running = await containerRunning(ctx, 'dojo-m2-a1', IMAGE)
      if (!running.ok) return running
      return httpAnswers(ctx, 'http://127.0.0.1:47201', { contains: 'Bonjour depuis dojo-m2' })
    },
  },
] satisfies Criterion[]
