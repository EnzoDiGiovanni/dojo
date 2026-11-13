import type { Criterion } from '#check'
import { fail, fixture, onVps, pass, sshdSetting, sshLogin, sshMethods } from '../../../helpers.ts'

const VPS = 'dojo-linux-m5-d1'
const PORT = 47556

export default [
  {
    id: 'ci',
    label: '`deploy` se connecte avec la clé de la CI',
    run: onVps(VPS, async (vps, ctx) => {
      const r = await sshLogin(ctx, { port: PORT, user: 'deploy', key: fixture(import.meta.url, 'deploy'), command: 'whoami' })
      if (r.stdout.trim() === 'deploy') return pass()
      const last = await vps.out(`journalctl -t sshd --no-pager -o cat | grep -iE 'deploy|refused' | tail -n 1`)
      return fail(`Connexion refusée${last ? ` ; dernière ligne du journal de sshd à ce sujet : « ${last.slice(0, 140)} »` : ''}.`)
    }),
  },
  {
    id: 'no-password',
    label: 'Le serveur ne propose l\'authentification par mot de passe à aucun compte',
    run: onVps(VPS, async (_vps, ctx) => {
      for (const user of ['deploy', 'ubuntu', 'root']) {
        const methods = await sshMethods(ctx, PORT, user)
        if (!methods) return fail(`Le serveur ne répond pas sur le port ${PORT}.`)
        if (methods.some((m) => m === 'password' || m === 'keyboard-interactive')) return fail(`Méthodes proposées à ${user} : ${methods.join(', ')}.`)
      }
      return pass()
    }),
  },
  {
    id: 'policy',
    label: 'Seuls `ubuntu` et `deploy` sont autorisés à se connecter, et root ne peut pas se connecter',
    run: onVps(VPS, async (vps) => {
      const users = (await sshdSetting(vps, 'allowusers')).split(' ').filter(Boolean).sort()
      if (users.join(' ') !== 'deploy ubuntu') return fail(`AllowUsers effectif : ${users.join(' ') || 'aucun'}.`)
      const root = await sshdSetting(vps, 'permitrootlogin', 'user=root,host=client,addr=203.0.113.9')
      return root === 'no' ? pass() : fail(`PermitRootLogin effectif : ${root}.`)
    }),
  },
  {
    id: 'strictmodes',
    label: 'sshd vérifie toujours les droits des fichiers des comptes avant d\'accepter une clé',
    run: onVps(VPS, async (vps) => {
      const value = await sshdSetting(vps, 'strictmodes')
      return value === 'yes' ? pass() : fail(`StrictModes effectif : ${value || 'illisible'}.`)
    }),
  },
] satisfies Criterion[]
