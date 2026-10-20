import type { Criterion } from '#check'
import { containerIp, fileMatches } from '../../../helpers.ts'

const NAME = 'dojo-m1-a2'

export default [
  {
    id: 'token',
    label: '`token.txt` contient le jeton stocké dans `/srv/dojo/token` du conteneur',
    async run(ctx) {
      const r = await ctx.docker(['exec', NAME, 'cat', '/srv/dojo/token'])
      return fileMatches(ctx, 'token.txt', r.code === 0 ? r.stdout : null, 'jeton du conteneur')
    },
  },
  {
    id: 'code',
    label: '`code.txt` contient le code secret affiché une seule fois dans les logs',
    async run(ctx) {
      const r = await ctx.docker(['logs', NAME])
      const code = (r.stdout + r.stderr).match(/code secret : ([0-9a-f]+)/)?.[1] ?? null
      return fileMatches(ctx, 'code.txt', r.code === 0 ? code : null, 'code secret')
    },
  },
  {
    id: 'ip',
    label: '`ip.txt` contient l\'adresse IP du conteneur',
    async run(ctx) {
      const info = await ctx.inspectContainer(NAME)
      return fileMatches(ctx, 'ip.txt', info?.State?.Running ? containerIp(info) : null, 'adresse IP du conteneur')
    },
  },
] satisfies Criterion[]
