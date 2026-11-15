import type { Criterion } from '#check'
import { fail, onVps, pass, q, type Vps } from '../../../helpers.ts'

const VPS = 'dojo-linux-m1-a2'
const CACHE = '/var/cache/vitrine'
const OLD_TMP = ['sessions/sess_a81f.tmp', 'sessions/sess_77c2.tmp', 'vignettes/panier 2024.tmp', 'rendu-accueil.tmp']
const KEPT = ['sessions/sess_e910.tmp', 'vignettes/produit-12.tmp', 'export.tmp/clients.csv', 'vignettes/produit-12.jpg', 'regles.conf']
const BIG = { 'sauvegarde-site.tar': 120, 'photos/shooting printemps.zip': 80, 'compta/export-2024.csv': 51 }
const SMALL = ['compta/grand-livre.pdf', 'presentation.pdf', 'notes.txt']

const isFile = (vps: Vps, f: string) => vps.test(`test -f ${q(f)}`)
const list = (items: string[]) => items.slice(0, 3).join(', ') + (items.length > 3 ? ` (+${items.length - 3})` : '')

export default [
  {
    id: 'purged',
    label: 'Plus aucun fichier `.tmp` de plus de 7 jours sous `/var/cache/vitrine`',
    run: onVps(VPS, async (vps) => {
      const left = []
      for (const f of OLD_TMP) if (await isFile(vps, `${CACHE}/${f}`)) left.push(f)
      return left.length ? fail(`Encore présents : ${list(left)}.`) : pass()
    }),
  },
  {
    id: 'kept',
    label: 'Les fichiers `.tmp` récents et les fichiers d\'autres extensions du cache sont toujours là',
    run: onVps(VPS, async (vps) => {
      const missing = []
      for (const f of KEPT) if (!(await isFile(vps, `${CACHE}/${f}`))) missing.push(f)
      return missing.length ? fail(`Disparus : ${list(missing)}.`) : pass()
    }),
  },
  {
    id: 'archived',
    label: 'Les fichiers de plus de 50 Mo de `/srv/partage` sont dans `/srv/archive`, avec leur nom d\'origine',
    run: onVps(VPS, async (vps) => {
      const problems = []
      for (const [f, mb] of Object.entries(BIG)) {
        const name = f.split('/').pop()!
        const size = Number(await vps.out(`stat -c %s ${q(`/srv/archive/${name}`)} 2>/dev/null`))
        if (size !== mb * 1024 * 1024) problems.push(`${name} absent de /srv/archive`)
        else if (await isFile(vps, `/srv/partage/${f}`)) problems.push(`${f} toujours dans /srv/partage`)
      }
      return problems.length ? fail(`${list(problems)}.`) : pass()
    }),
  },
  {
    id: 'untouched',
    label: 'Les autres fichiers de `/srv/partage` n\'ont pas bougé',
    run: onVps(VPS, async (vps) => {
      const missing = []
      for (const f of SMALL) if (!(await isFile(vps, `/srv/partage/${f}`))) missing.push(f)
      return missing.length ? fail(`Plus à leur place : ${list(missing)}.`) : pass()
    }),
  },
] satisfies Criterion[]
