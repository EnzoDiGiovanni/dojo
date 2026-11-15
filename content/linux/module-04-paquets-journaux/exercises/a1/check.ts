import type { Criterion } from '#check'
import { fail, onVps, pass } from '../../../helpers.ts'

const VPS = 'dojo-linux-m4-a1'

export default [
  {
    id: 'install',
    label: '`jq` et `tree` sont installés et fonctionnent',
    run: onVps(VPS, async (vps) => {
      for (const p of ['jq', 'tree']) {
        const status = await vps.out(`dpkg-query -W -f='\${Status}' ${p} 2>/dev/null`)
        if (status !== 'install ok installed') return fail(`${p} : ${status || 'non installé'}.`)
      }
      const jq = await vps.out(`echo '{"ville":"Lyon"}' | jq -r .ville`)
      return jq === 'Lyon' && (await vps.test('tree -L 1 /etc >/dev/null')) ? pass() : fail('jq ou tree ne s\'exécute pas correctement.')
    }),
  },
  {
    id: 'purge',
    label: '`screen` est désinstallé, et sa configuration a disparu du serveur',
    run: onVps(VPS, async (vps) => {
      const status = await vps.out(`dpkg-query -W -f='\${Status}' screen 2>/dev/null`)
      if (status === 'install ok installed') return fail('screen est toujours installé.')
      if (await vps.test('test -e /etc/screenrc')) return fail(`screen n'est plus installé (état dpkg : ${status}), mais /etc/screenrc est toujours là.`)
      return status.includes('config-files') ? fail(`État dpkg de screen : ${status}.`) : pass()
    }),
  },
  {
    id: 'hold',
    label: '`curl` est retenu : les mises à jour ne changeront pas sa version',
    run: onVps(VPS, async (vps) => {
      if (!(await vps.test('dpkg-query -W -f="\\${Status}" curl | grep -q "ok installed"'))) return fail('curl n\'est plus installé.')
      const held = (await vps.out('apt-mark showhold')).split('\n')
      return held.includes('curl') ? pass() : fail(`Paquets retenus : ${held.filter(Boolean).join(', ') || 'aucun'}.`)
    }),
  },
] satisfies Criterion[]
