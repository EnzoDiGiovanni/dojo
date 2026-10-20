import type { Criterion } from '#check'
import { containerRunning, fail, hostBinding, httpAnswers, pass } from '../../../helpers.ts'

const NAME = 'dojo-m1-i1'

export default [
  {
    id: 'running',
    label: '`dojo-m1-i1` tourne depuis l\'image `traefik/whoami:v1.10`',
    run: (ctx) => containerRunning(ctx, NAME, 'traefik/whoami:v1.10'),
  },
  {
    id: 'http',
    label: 'http://127.0.0.1:47102 répond et la page contient `Name: dojo`',
    run: (ctx) => httpAnswers(ctx, 'http://127.0.0.1:47102', { contains: 'Name: dojo' }),
  },
  {
    id: 'inner-port',
    label: 'Le serveur écoute sur le port 9000 à l\'intérieur du conteneur',
    async run(ctx) {
      const binding = await hostBinding(ctx, NAME, 9000)
      if (!binding) return fail('Aucune publication ne pointe vers le port 9000 du conteneur.')
      const res = await ctx.http(`http://127.0.0.1:${binding.hostPort}`)
      return res ? pass() : fail(`Le port 9000 du conteneur est publié sur ${binding.hostPort}, mais rien n'y répond.`)
    },
  },
  {
    id: 'loopback',
    label: 'Le port n\'est publié que sur l\'interface locale 127.0.0.1',
    async run(ctx) {
      const info = await ctx.inspectContainer(NAME)
      const bindings = Object.values(info?.HostConfig?.PortBindings ?? {}).flat() as { HostIp: string }[]
      if (bindings.length === 0) return fail('Aucun port publié.')
      const exposed = bindings.filter((b) => b.HostIp !== '127.0.0.1')
      return exposed.length === 0 ? pass() : fail(`Interface(s) d'écoute : ${bindings.map((b) => b.HostIp || '0.0.0.0').join(', ')}.`)
    },
  },
  {
    id: 'restart',
    label: 'La politique de redémarrage correspond au besoin exprimé',
    async run(ctx) {
      const info = await ctx.inspectContainer(NAME)
      if (!info) return fail('Aucun conteneur nommé dojo-m1-i1.')
      const policy = info.HostConfig.RestartPolicy
      return policy.Name === 'unless-stopped' ? pass() : fail(`Politique actuelle : ${policy.Name || 'no'}.`)
    },
  },
] satisfies Criterion[]
