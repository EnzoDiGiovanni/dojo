import type { Criterion } from '#check'
import { fail, fixture, onVps, pass, sshdSetting, sshLogin } from '../../../helpers.ts'

const VPS = 'dojo-linux-m5-i1'
const PORT = 47554
const key = (name: string) => fixture(import.meta.url, name)

const login = async (ctx: Parameters<typeof sshLogin>[0], user: string, keyName: string) =>
  (await sshLogin(ctx, { port: PORT, user, key: key(keyName), command: 'whoami' })).stdout.trim() === user

export default [
  {
    id: 'team',
    label: '`lea` et `hugo` se connectent en SSH avec leur clé',
    run: onVps(VPS, async (_vps, ctx) => {
      for (const u of ['lea', 'hugo']) if (!(await login(ctx, u, u))) return fail(`${u} ne parvient pas à se connecter avec sa clé.`)
      return pass()
    }),
  },
  {
    id: 'nina',
    label: '`nina` ne peut plus se connecter en SSH, bien que sa clé soit toujours installée',
    run: onVps(VPS, async (vps, ctx) => {
      const pub = (await vps.readFile('/home/nina/.ssh/authorized_keys')) ?? ''
      if (!pub.includes('nina@poste')) return fail('La clé de nina a été retirée de son authorized_keys.')
      return (await login(ctx, 'nina', 'nina')) ? fail('nina se connecte toujours avec sa clé.') : pass()
    }),
  },
  {
    id: 'deploy',
    label: '`deploy` se connecte toujours avec la clé de la CI, mais plus avec celle de l\'ancien prestataire',
    run: onVps(VPS, async (_vps, ctx) => {
      if (!(await login(ctx, 'deploy', 'deploy'))) return fail('La clé de la CI ne permet plus de se connecter à deploy.')
      return (await login(ctx, 'deploy', 'ancien')) ? fail('La clé de l\'ancien prestataire ouvre toujours le compte deploy.') : pass()
    }),
  },
  {
    id: 'allowgroups',
    label: 'Seuls les membres de `ssh-acces` peuvent se connecter, et `ubuntu` en fait partie',
    run: onVps(VPS, async (vps) => {
      const groups = await sshdSetting(vps, 'allowgroups')
      if (groups.split(' ').filter(Boolean).join(' ') !== 'ssh-acces') return fail(`AllowGroups effectif : ${groups || 'aucun'}.`)
      const users = await sshdSetting(vps, 'allowusers')
      if (users) return fail(`Une liste AllowUsers s'ajoute à la règle : ${users}.`)
      const members = (await vps.out('getent group ssh-acces | cut -d: -f4')).split(',')
      const missing = ['ubuntu', 'deploy', 'lea', 'hugo'].filter((u) => !members.includes(u))
      return missing.length ? fail(`Absents du groupe ssh-acces : ${missing.join(', ')}.`) : pass()
    }),
  },
] satisfies Criterion[]
