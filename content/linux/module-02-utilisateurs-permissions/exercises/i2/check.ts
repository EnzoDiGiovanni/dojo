import type { Criterion } from '#check'
import { fail, lines, onVps, pass } from '../../../helpers.ts'

const VPS = 'dojo-linux-m2-i2'
const ARCHIVE = '/srv/archives/marc.tar.gz'

export default [
  {
    id: 'marc',
    label: '`marc` n\'existe plus, et son dossier personnel est dans `/srv/archives/marc.tar.gz` avec ses droits d\'origine',
    run: onVps(VPS, async (vps) => {
      if (await vps.test('getent passwd marc >/dev/null')) return fail('Le compte marc existe toujours.')
      if (await vps.test('test -e /home/marc')) return fail('/home/marc existe toujours.')
      const listing = await vps.sh(`tar -tzvf ${ARCHIVE}`)
      if (listing.code !== 0) return fail(`${ARCHIVE} est absente ou illisible.`)
      for (const file of ['notes.txt', '.ssh/authorized_keys']) {
        const line = lines(listing.stdout).find((l) => l.endsWith(`/${file}`) || l.endsWith(` ${file}`))
        if (!line) return fail(`L'archive ne contient pas ${file}.`)
        const [perms, owner] = line.split(' ')
        if (perms !== '-rw-------' || !/^(marc|1001)\//.test(owner)) return fail(`Dans l'archive, ${file} est enregistré en ${perms} ${owner}.`)
      }
      return lines(listing.stdout).some((l) => l.endsWith('brouillon.md')) ? pass() : fail('L\'archive ne contient pas projets/brouillon.md.')
    }),
  },
  {
    id: 'orphans',
    label: 'Plus aucun fichier du serveur n\'appartient à un utilisateur inexistant, et les anciens fichiers de `marc` appartiennent à `lea`',
    run: onVps(VPS, async (vps) => {
      const orphans = lines(await vps.out('find / -xdev \\( -path /proc -o -path /sys \\) -prune -o -nouser -print 2>/dev/null'))
      if (orphans.length) return fail(`${orphans.length} fichier(s) sans propriétaire existant, dont ${orphans[0]}.`)
      const wrong = lines(await vps.out(`while read -r f; do o=$(stat -c %U "$f" 2>/dev/null || echo absent); [ "$o" = lea ] || echo "$f ($o)"; done < /root/.dojo/marc-files.txt`))
      return wrong.length ? fail(`N'appartiennent pas à lea : ${wrong.join(', ')}.`) : pass()
    }),
  },
  {
    id: 'sami',
    label: '`sami` existe avec l\'UID 1500, un dossier personnel et le shell bash, et elle est membre de `devs`',
    run: onVps(VPS, async (vps) => {
      const entry = await vps.out('getent passwd sami')
      if (!entry) return fail('Aucun compte sami.')
      const [, , uid, , , home, shell] = entry.split(':')
      if (uid !== '1500') return fail(`UID de sami : ${uid}.`)
      if (shell !== '/bin/bash') return fail(`Shell de sami : ${shell || '(vide)'}.`)
      if ((await vps.out(`stat -c %U ${home} 2>/dev/null`)) !== 'sami') return fail(`Dossier personnel ${home} absent ou n'appartenant pas à sami.`)
      const groups = (await vps.out('id -nG sami')).split(' ')
      return groups.includes('devs') ? pass() : fail(`Groupes de sami : ${groups.join(', ')}.`)
    }),
  },
  {
    id: 'policy',
    label: 'Le compte de `sami` expire le 30 juin 2027, et son mot de passe devra être changé à la première connexion',
    run: onVps(VPS, async (vps) => {
      const shadow = (await vps.out('getent shadow sami')).split(':')
      if (shadow.length < 8) return fail('Aucun compte sami.')
      const expected = await vps.out('echo $(( $(date -ud 2027-06-30 +%s) / 86400 ))')
      if (shadow[7] !== expected) {
        const shown = shadow[7] ? await vps.out(`date -ud @$(( ${shadow[7]} * 86400 )) +%F`) : 'jamais'
        return fail(`Date d'expiration du compte : ${shown}.`)
      }
      return shadow[2] === '0' ? pass() : fail('Le mot de passe de sami n\'est pas marqué comme devant être changé.')
    }),
  },
] satisfies Criterion[]
