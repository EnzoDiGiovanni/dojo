import type { Criterion } from '#check'
import { fail, lines, onVps, pass, q, type Vps } from '../../../helpers.ts'

const VPS = 'dojo-linux-m1-v1'
const SCRIPT = '/home/ubuntu/outils/commandes.sh'
const MEDIA = '/srv/traiteur/media'
const OLD_BAK = ['menus/menu-noel.pdf.bak', 'photos/buffet mariage.jpg.bak', 'tarifs.bak']
const KEPT = ['menus/menu-hiver.pdf.bak', 'anciens.bak/carte-2025.pdf', 'photos/buffet mariage.jpg', 'logo.svg']

const reference = async (vps: Vps, csv: string) =>
  lines(await vps.out(`awk -F';' 'NR > 1 { t[$3] += $4 } END { for (p in t) print t[p], p }' ${q(csv)} | sort -nr | head -n 3`))

async function compare(vps: Vps, csv: string) {
  if (!(await vps.test(`test -f ${SCRIPT}`))) return fail(`${SCRIPT} n'existe pas.`)
  const r = await vps.as('ubuntu', `bash ${SCRIPT} ${q(csv)}`)
  const got = lines(r.stdout)
  const want = await reference(vps, csv)
  if (got.join('\n') === want.join('\n')) return pass()
  if (!got.length) return fail(`Le script n'affiche rien (code ${r.code}${r.stderr.trim() ? ` : ${r.stderr.trim().split('\n')[0]}` : ''}).`)
  const i = got.findIndex((l, n) => l !== want[n])
  return fail(got.length !== 3 ? `Le script affiche ${got.length} ligne(s) au lieu de 3.` : `Ligne ${i + 1} affichée : « ${got[i]} ».`)
}

export default [
  {
    id: 'release',
    label: '`/srv/traiteur/releases/3.0` contient la version 3.0, fichiers cachés compris, et `/srv/traiteur/current` y mène',
    run: onVps(VPS, async (vps) => {
      const r = await vps.sh(`
        ref=$(mktemp -d) && tar -xzf /home/ubuntu/livraisons/traiteur-3.0.tar.gz -C "$ref" && cd "$ref"
        find . -type f | while IFS= read -r f; do cmp -s "$f" "/srv/traiteur/releases/3.0/$f" || echo "\${f#./}"; done
        rm -rf "$ref"`)
      const missing = lines(r.stdout)
      if (missing.length) return fail(`Absent ou différent dans releases/3.0 : ${missing.join(', ')}.`)
      const target = await vps.out('readlink -f /srv/traiteur/current')
      if (!(await vps.test('test -L /srv/traiteur/current'))) return fail('/srv/traiteur/current n\'est pas un lien symbolique.')
      return target === '/srv/traiteur/releases/3.0' ? pass() : fail(`current mène à ${target || 'un chemin inexistant'}.`)
    }),
  },
  {
    id: 'media',
    label: 'Plus aucun fichier `.bak` de plus de 30 jours sous `/srv/traiteur/media`, et rien d\'autre n\'a disparu',
    run: onVps(VPS, async (vps) => {
      const left = []
      for (const f of OLD_BAK) if (await vps.test(`test -f ${q(`${MEDIA}/${f}`)}`)) left.push(f)
      if (left.length) return fail(`Encore présents : ${left.join(', ')}.`)
      const gone = []
      for (const f of KEPT) if (!(await vps.test(`test -f ${q(`${MEDIA}/${f}`)}`))) gone.push(f)
      return gone.length ? fail(`Disparus à tort : ${gone.join(', ')}.`) : pass()
    }),
  },
  {
    id: 'stats',
    label: 'Sur `commandes.csv`, `commandes.sh` affiche les 3 produits les plus commandés au format `<total> <produit>`, dans l\'ordre',
    run: onVps(VPS, (vps) => compare(vps, '/srv/traiteur/data/commandes.csv')),
  },
  {
    id: 'other-csv',
    label: '`commandes.sh` donne un résultat exact sur un autre fichier de commandes, quel que soit son chemin',
    run: onVps(VPS, async (vps) => {
      const csv = '/tmp/dojo check/commandes de décembre.csv'
      await vps.sh(`mkdir -p ${q('/tmp/dojo check')} && python3 /usr/local/lib/dojo/gencsv.py ${Date.now() % 100_000} ${q(csv)} && chmod -R a+rX ${q('/tmp/dojo check')}`)
      const outcome = await compare(vps, csv)
      await vps.sh(`rm -rf ${q('/tmp/dojo check')}`)
      return outcome
    }),
  },
] satisfies Criterion[]
