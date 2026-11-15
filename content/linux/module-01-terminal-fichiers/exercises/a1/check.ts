import type { Criterion } from '#check'
import { fail, onVps, pass, type Vps } from '../../../helpers.ts'

const VPS = 'dojo-linux-m1-a1'
const VERSIONS = ['1.0', '1.1']

// Extracts the delivered archive into a scratch dir and diffs it against the learner's release dir.
async function diffRelease(vps: Vps, version: string, hidden: boolean): Promise<string | null> {
  const dest = `/srv/vitrine/releases/${version}`
  if (!(await vps.test(`test -d ${dest}`))) return `Le dossier ${dest} n'existe pas.`
  const filter = hidden ? `-name '.*'` : `-not -name '.*'`
  const r = await vps.sh(`
    ref=$(mktemp -d) && tar -xzf /home/ubuntu/livraisons/vitrine-${version}.tar.gz -C "$ref" --strip-components=1 2>/dev/null || exit 3
    cd "$ref" && expected=$(find . -type f ${filter} | sort)
    for f in $expected; do
      [ -f "${dest}/$f" ] || { echo "manque ${dest}/\${f#./}"; continue; }
      cmp -s "$f" "${dest}/$f" || echo "contenu différent : ${dest}/\${f#./}"
    done
    rm -rf "$ref"`)
  if (r.code === 3) return 'Archive livrée illisible.'
  const problems = r.stdout.trim().split('\n').filter(Boolean)
  return problems.length ? `${problems.slice(0, 3).join(' ; ')}${problems.length > 3 ? ` (+${problems.length - 3})` : ''}.` : null
}

export default [
  {
    id: 'releases',
    label: '`releases/1.0` et `releases/1.1` contiennent les fichiers de leur version, `index.html` à la racine',
    run: onVps(VPS, async (vps) => {
      for (const v of VERSIONS) {
        const problem = await diffRelease(vps, v, false)
        if (problem) return fail(problem)
      }
      return pass()
    }),
  },
  {
    id: 'hidden',
    label: 'Les fichiers cachés des archives sont présents dans chaque version',
    run: onVps(VPS, async (vps) => {
      for (const v of VERSIONS) {
        const problem = await diffRelease(vps, v, true)
        if (problem) return fail(problem)
      }
      return pass()
    }),
  },
  {
    id: 'current',
    label: '`/srv/vitrine/current` est un lien symbolique vers la version 1.1',
    run: onVps(VPS, async (vps) => {
      if (!(await vps.test('test -e /srv/vitrine/current || test -L /srv/vitrine/current'))) return fail('/srv/vitrine/current n\'existe pas.')
      if (!(await vps.test('test -L /srv/vitrine/current'))) return fail('/srv/vitrine/current existe mais n\'est pas un lien symbolique.')
      const target = await vps.out('readlink /srv/vitrine/current')
      const resolved = await vps.out('readlink -f /srv/vitrine/current')
      if (resolved !== '/srv/vitrine/releases/1.1') return fail(`Le lien contient « ${target} », qui mène à ${resolved || 'un chemin inexistant'}.`)
      return pass(`current → ${target}`)
    }),
  },
  {
    id: 'uploads',
    label: '`/srv/vitrine/shared/uploads` est un dossier',
    run: onVps(VPS, async (vps) =>
      (await vps.test('test -d /srv/vitrine/shared/uploads -a ! -L /srv/vitrine/shared/uploads')) ? pass() : fail('/srv/vitrine/shared/uploads n\'est pas un dossier.'),
    ),
  },
  {
    id: 'archives',
    label: 'Les archives livrées sont intactes dans `/home/ubuntu/livraisons`',
    run: onVps(VPS, async (vps) => {
      for (const v of VERSIONS) {
        const f = `/home/ubuntu/livraisons/vitrine-${v}.tar.gz`
        if (!(await vps.test(`tar -tzf ${f} >/dev/null 2>&1`))) return fail(`${f} est absente ou illisible.`)
      }
      return pass()
    }),
  },
] satisfies Criterion[]
