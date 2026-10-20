import type { Criterion } from '#check'
import { containerIp, containerNames, containerRunning, fail, hostBinding, httpAnswers, pass } from '../../../helpers.ts'

const NAME = 'dojo-m1-v1'
const IMAGE = 'hashicorp/http-echo:1.0'

export default [
  {
    id: 'running',
    label: '`dojo-m1-v1` tourne depuis l\'image `hashicorp/http-echo:1.0`',
    run: (ctx) => containerRunning(ctx, NAME, IMAGE),
  },
  {
    id: 'http',
    label: 'http://127.0.0.1:47120 renvoie exactement `dojo-validation`',
    run: (ctx) => httpAnswers(ctx, 'http://127.0.0.1:47120', { exact: 'dojo-validation' }),
  },
  {
    id: 'inner-port',
    label: 'Le serveur écoute sur le port 5000 à l\'intérieur du conteneur',
    async run(ctx) {
      const binding = await hostBinding(ctx, NAME, 5000)
      if (!binding) return fail('Aucune publication ne pointe vers le port 5000 du conteneur.')
      return (await ctx.http(`http://127.0.0.1:${binding.hostPort}`)) ? pass() : fail('Rien ne répond derrière le port 5000 du conteneur.')
    },
  },
  {
    id: 'loopback',
    label: 'Le port n\'est publié que sur l\'interface locale 127.0.0.1',
    async run(ctx) {
      const info = await ctx.inspectContainer(NAME)
      const bindings = Object.values(info?.HostConfig?.PortBindings ?? {}).flat() as { HostIp: string }[]
      if (bindings.length === 0) return fail('Aucun port publié.')
      return bindings.every((b) => b.HostIp === '127.0.0.1') ? pass() : fail(`Interface(s) d'écoute : ${bindings.map((b) => b.HostIp || '0.0.0.0').join(', ')}.`)
    },
  },
  {
    id: 'restart',
    label: 'Le conteneur redémarre en cas d\'échec, au plus 3 fois, et jamais après une sortie normale',
    async run(ctx) {
      const policy = (await ctx.inspectContainer(NAME))?.HostConfig?.RestartPolicy
      if (!policy) return fail('Aucun conteneur nommé dojo-m1-v1.')
      return policy.Name === 'on-failure' && policy.MaximumRetryCount === 3
        ? pass()
        : fail(`Politique actuelle : ${policy.Name || 'no'}${policy.MaximumRetryCount ? `, ${policy.MaximumRetryCount} tentative(s) max` : ''}.`)
    },
  },
  {
    id: 'infos',
    label: '`infos.env` contient l\'adresse IP du conteneur et l\'identifiant court de son image',
    async run(ctx) {
      const infos = await ctx.readEnvFile('infos.env')
      if (!infos) return fail('Fichier infos.env absent.')
      const info = await ctx.inspectContainer(NAME)
      if (!info?.State?.Running) return fail('Le conteneur dojo-m1-v1 ne tourne pas.')
      const wrong: string[] = []
      if (infos.CONTAINER_IP !== containerIp(info)) wrong.push('CONTAINER_IP')
      if (infos.IMAGE_ID !== String(info.Image).replace(/^sha256:/, '').slice(0, 12)) wrong.push('IMAGE_ID')
      return wrong.length === 0 ? pass() : fail(`Valeur(s) incorrecte(s) ou absente(s) : ${wrong.join(', ')}.`)
    },
  },
  {
    id: 'no-leftover',
    label: 'Aucun conteneur arrêté issu de `hashicorp/http-echo:1.0` ne traîne',
    async run(ctx) {
      const names = await containerNames(ctx, [`ancestor=${IMAGE}`, 'status=exited'])
      return names.length === 0 ? pass() : fail(`${names.length} conteneur(s) arrêté(s) : ${names.join(', ')}.`)
    },
  },
] satisfies Criterion[]
