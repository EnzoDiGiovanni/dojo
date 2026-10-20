import type { Criterion } from '#check'
import { containerNames, fail, fileMatches, pass } from '../../../helpers.ts'

export default [
  {
    id: 'release',
    label: '`release.txt` contient la version d\'Alpine de l\'image `alpine:3.20`',
    async run(ctx) {
      const r = await ctx.runOnce('alpine:3.20', ['cat', '/etc/alpine-release'])
      return fileMatches(ctx, 'release.txt', r.code === 0 ? r.stdout : null, 'version de l\'image')
    },
  },
  {
    id: 'no-leftover',
    label: 'Aucun conteneur arrêté issu de `alpine:3.20` ne traîne sur ta machine',
    async run(ctx) {
      const names = await containerNames(ctx, ['ancestor=alpine:3.20', 'status=exited'])
      return names.length === 0 ? pass() : fail(`${names.length} conteneur(s) arrêté(s) trouvé(s) : ${names.join(', ')}.`)
    },
  },
  {
    id: 'web-stopped',
    label: 'Le conteneur `dojo-m1-a3-web` existe et est arrêté',
    async run(ctx) {
      const info = await ctx.inspectContainer('dojo-m1-a3-web')
      if (!info) return fail('Aucun conteneur nommé dojo-m1-a3-web.')
      if (info.Config.Image !== 'nginx:alpine') return fail(`Image du conteneur : ${info.Config.Image}.`)
      if (info.State.StartedAt.startsWith('0001-')) return fail('Le conteneur n\'a jamais été démarré.')
      return info.State.Status === 'exited' ? pass() : fail(`État du conteneur : ${info.State.Status}.`)
    },
  },
  {
    id: 'web-exit-code',
    label: '`dojo-m1-a3-web` s\'est terminé avec le code de sortie 0',
    async run(ctx) {
      const info = await ctx.inspectContainer('dojo-m1-a3-web')
      if (!info || info.State.Status !== 'exited') return fail('Le conteneur n\'est pas arrêté.')
      return info.State.ExitCode === 0 ? pass() : fail(`Code de sortie : ${info.State.ExitCode}.`)
    },
  },
] satisfies Criterion[]
