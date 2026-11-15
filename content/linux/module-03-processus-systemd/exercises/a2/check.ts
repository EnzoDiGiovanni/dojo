import type { Criterion } from '#check'
import { fail, onVps, pass, type Vps } from '../../../helpers.ts'

const VPS = 'dojo-linux-m3-a2'
const state = async (vps: Vps, unit: string) => ({
  active: await vps.out(`systemctl is-active ${unit}`),
  enabled: await vps.out(`systemctl is-enabled ${unit} 2>/dev/null`),
})
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default [
  {
    id: 'rapport',
    label: '`rapport` tourne, et est activé au démarrage du serveur',
    run: onVps(VPS, async (vps) => {
      const s = await state(vps, 'rapport')
      return s.active === 'active' && s.enabled === 'enabled' ? pass() : fail(`rapport : ${s.active}, ${s.enabled}.`)
    }),
  },
  {
    id: 'sync',
    label: '`vitrine-sync` est arrêté, et rien ne le relance',
    run: onVps(VPS, async (vps) => {
      const s = await state(vps, 'vitrine-sync')
      if (s.active === 'active') return fail('vitrine-sync tourne.')
      if (s.enabled === 'enabled') return fail('vitrine-sync est toujours activé au démarrage.')
      const timer = await state(vps, 'vitrine-sync.timer')
      return timer.active === 'active' ? fail('vitrine-sync.timer est actif : il relancera le service.') : pass()
    }),
  },
  {
    id: 'ftp',
    label: '`ancien-ftp` ne peut plus être démarré, même à la main',
    run: onVps(VPS, async (vps) => {
      const r = await vps.sh('systemctl start ancien-ftp 2>&1')
      if (r.code === 0) {
        await vps.sh('systemctl stop ancien-ftp')
        return fail('systemctl start ancien-ftp a fonctionné.')
      }
      const s = await state(vps, 'ancien-ftp')
      return s.enabled === 'masked' ? pass() : fail(`Le démarrage échoue, mais ancien-ftp est « ${s.enabled} » : ${r.stdout.trim().split('\n')[0]}`)
    }),
  },
  {
    id: 'reboot',
    label: 'Après un redémarrage du serveur, `rapport` tourne et `vitrine-sync` reste arrêté',
    run: onVps(VPS, async (vps) => {
      const notBack = await vps.reboot()
      if (notBack) return notBack
      await sleep(8000)
      const rapport = await state(vps, 'rapport')
      const sync = await state(vps, 'vitrine-sync')
      if (rapport.active !== 'active') return fail(`Après redémarrage, rapport est ${rapport.active}.`)
      return sync.active === 'active' ? fail('Après redémarrage, vitrine-sync tourne de nouveau.') : pass()
    }),
  },
] satisfies Criterion[]
