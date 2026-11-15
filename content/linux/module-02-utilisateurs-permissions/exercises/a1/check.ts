import type { Criterion } from '#check'
import { fail, onVps, pass } from '../../../helpers.ts'

const VPS = 'dojo-linux-m2-a1'
const NOLOGIN = ['/usr/sbin/nologin', '/sbin/nologin', '/bin/false', '/usr/bin/false']

export default [
  {
    id: 'hugo',
    label: '`hugo` existe avec un dossier personnel, le shell `/bin/bash` et le nom complet « Hugo Bernard »',
    run: onVps(VPS, async (vps) => {
      const entry = await vps.out('getent passwd hugo')
      if (!entry) return fail('Aucun compte hugo.')
      const [, , , , gecos, home, shell] = entry.split(':')
      if (shell !== '/bin/bash') return fail(`Shell de hugo : ${shell || '(vide)'}.`)
      if (!gecos.startsWith('Hugo Bernard')) return fail(`Nom complet de hugo : « ${gecos} ».`)
      const owner = await vps.out(`stat -c %U ${home} 2>/dev/null`)
      return owner === 'hugo' ? pass() : fail(`Dossier personnel ${home} : ${owner ? `appartient à ${owner}` : 'absent'}.`)
    }),
  },
  {
    id: 'devs',
    label: '`hugo` et `lea` sont membres de `devs`, et `lea` est toujours membre de `compta`',
    run: onVps(VPS, async (vps) => {
      if (!(await vps.test('getent group devs >/dev/null'))) return fail('Aucun groupe devs.')
      const groups = async (u: string) => (await vps.out(`id -nG ${u} 2>/dev/null`)).split(' ')
      const lea = await groups('lea')
      const hugo = await groups('hugo')
      if (!hugo.includes('devs')) return fail(`Groupes de hugo : ${hugo.join(', ') || 'aucun'}.`)
      if (!lea.includes('devs') || !lea.includes('compta')) return fail(`Groupes de lea : ${lea.join(', ')}.`)
      return pass()
    }),
  },
  {
    id: 'vitrine',
    label: '`vitrine` est un compte système (UID inférieur à 1000) sans shell de connexion',
    run: onVps(VPS, async (vps) => {
      const entry = await vps.out('getent passwd vitrine')
      if (!entry) return fail('Aucun compte vitrine.')
      const [, , uid, , , , shell] = entry.split(':')
      if (Number(uid) >= 1000) return fail(`UID de vitrine : ${uid}.`)
      return NOLOGIN.includes(shell) ? pass(`UID ${uid}, shell ${shell}.`) : fail(`Shell de vitrine : ${shell || '(vide)'}.`)
    }),
  },
  {
    id: 'stagiaire',
    label: 'Le mot de passe de `stagiaire` est verrouillé, et son dossier personnel est intact',
    run: onVps(VPS, async (vps) => {
      const status = (await vps.out('passwd -S stagiaire 2>/dev/null')).split(' ')
      if (!status[0]) return fail('Le compte stagiaire n\'existe plus.')
      if (status[1] !== 'L') return fail(`État du mot de passe de stagiaire (passwd -S) : ${status[1]}.`)
      return (await vps.test('grep -q "30 août" /home/stagiaire/rapport.md')) ? pass() : fail('/home/stagiaire/rapport.md a disparu.')
    }),
  },
] satisfies Criterion[]
