import type { Criterion } from '#check'
import { fail, onVps, pass, sshdSetting, sshMethods } from '../../../helpers.ts'

const VPS = 'dojo-linux-m5-a3'
const PORT = 47553

export default [
  {
    id: 'no-password',
    label: 'Le serveur ne propose plus l\'authentification par mot de passe, à aucun compte',
    run: onVps(VPS, async (_vps, ctx) => {
      for (const user of ['deploy', 'ubuntu', 'root']) {
        const methods = await sshMethods(ctx, PORT, user)
        if (!methods) return fail(`Le serveur ne répond pas sur le port ${PORT}.`)
        const weak = methods.filter((m) => m === 'password' || m === 'keyboard-interactive')
        if (weak.length) return fail(`Méthodes proposées à ${user} : ${methods.join(', ')}.`)
      }
      return pass()
    }),
  },
  {
    id: 'root',
    label: '`root` ne peut pas se connecter en SSH, même avec une clé',
    run: onVps(VPS, async (vps) => {
      const value = await sshdSetting(vps, 'permitrootlogin', 'user=root,host=client,addr=203.0.113.9')
      return value === 'no' ? pass() : fail(`PermitRootLogin effectif pour root : ${value || 'illisible'}.`)
    }),
  },
  {
    id: 'config',
    label: 'La configuration est valide, `sshd_config` est intact et tes réglages sont dans `sshd_config.d/`',
    run: onVps(VPS, async (vps) => {
      const t = await vps.sh('install -d -m 0755 /run/sshd && sshd -t 2>&1')
      if (t.code !== 0) return fail(`sshd -t : ${t.stdout.trim().split('\n')[0]}`)
      if (!(await vps.test('sha256sum --quiet -c /root/.dojo/sshd_config.sha256 >/dev/null 2>&1'))) return fail('/etc/ssh/sshd_config a été modifié.')
      const custom = (await vps.out(`grep -liE '^\\s*(PasswordAuthentication|PermitRootLogin)' /etc/ssh/sshd_config.d/*.conf 2>/dev/null | grep -v '/50-cloud-init.conf$'`)).split('\n').filter(Boolean)
      const cloudInitEdited = !(await vps.test('sha256sum --quiet -c /root/.dojo/cloud-init.sha256 >/dev/null 2>&1'))
      return custom.length || cloudInitEdited ? pass() : fail('Aucun de tes réglages d\'authentification dans /etc/ssh/sshd_config.d/.')
    }),
  },
  {
    id: 'tested',
    label: 'Après ta dernière modification de la configuration, `deploy` s\'est reconnecté avec sa clé',
    run: onVps(VPS, async (vps) => {
      const changed = Number(await vps.out('stat -c %Y /etc/ssh/sshd_config /etc/ssh/sshd_config.d /etc/ssh/sshd_config.d/* 2>/dev/null | sort -n | tail -n 1'))
      const last = await vps.out(`journalctl -t sshd -o short-unix --no-pager | grep 'Accepted publickey for deploy ' | tail -n 1 | cut -d' ' -f1`)
      if (!last) return fail('Aucune connexion de deploy par clé dans le journal.')
      const at = Number(last)
      return at > changed ? pass() : fail(`Dernière connexion de deploy par clé : ${await vps.out(`date -d @${Math.floor(at)} +%H:%M:%S`)}, avant ta dernière modification (${await vps.out(`date -d @${changed} +%H:%M:%S`)}).`)
    }),
  },
] satisfies Criterion[]
