import type { Criterion } from '#check'
import { fail, lines, onVps, pass, type Vps } from '../../../helpers.ts'

const VPS = 'dojo-linux-m1-d1'
const SCRIPT = '/home/ubuntu/outils/deployer.sh'
const ARCHIVE = '/home/ubuntu/livraisons/atelier-2.11.tar.gz'

interface Deploy { base: string; runs: { code: number; err: string }[] }

// Deploys 2.11 `times` times on a fresh installation, as ubuntu, and returns the install dir.
async function deployFresh(vps: Vps, times = 1): Promise<Deploy> {
  const base = await vps.out(`d=$(mktemp -d /tmp/dojo-d1.XXXX) && sh /usr/local/lib/dojo/atelier-init.sh "$d" && chown -R ubuntu:ubuntu "$d" && echo "$d"`)
  const runs = []
  for (let i = 0; i < times; i++) {
    const r = await vps.as('ubuntu', `cd ~ && ATELIER_DIR=${base} bash ${SCRIPT} ${ARCHIVE}`)
    runs.push({ code: r.code, err: r.stderr.trim().split('\n').pop() ?? '' })
  }
  return { base, runs }
}

const cleanup = (vps: Vps, d: Deploy) => vps.sh(`rm -rf ${d.base}`)

async function inspect(vps: Vps, base: string) {
  return {
    current: await vps.out(`readlink -f ${base}/current`),
    exists: await vps.test(`test -d ${base}/current`),
    page: await vps.out(`cat ${base}/current/index.html 2>/dev/null`),
    releases: lines(await vps.out(`ls -1 ${base}/releases | sort -V`)),
  }
}

const runFailure = (d: Deploy) => {
  const bad = d.runs.findIndex((r) => r.code !== 0)
  return bad < 0 ? null : fail(`L'exécution n°${bad + 1} du script s'arrête avec le code ${d.runs[bad].code} : ${d.runs[bad].err}`)
}

export default [
  {
    id: 'current',
    label: 'Après un déploiement de la 2.11, `current` désigne la version 2.11 et sert son `index.html`',
    run: onVps(VPS, async (vps) => {
      const d = await deployFresh(vps)
      const s = await inspect(vps, d.base)
      await cleanup(vps, d)
      const failure = runFailure(d)
      if (failure) return failure
      if (s.current !== `${d.base}/releases/2.11`) return fail(`current mène à ${s.current ? s.current.replace(d.base, '<installation>') : 'un chemin inexistant'}${s.exists ? '' : ', qui n\'existe pas'}.`)
      return s.page.includes('version 2.11') ? pass() : fail('current/index.html n\'existe pas ou n\'est pas celui de la 2.11.')
    }),
  },
  {
    id: 'config',
    label: 'La version déployée contient toute la configuration partagée, fichiers cachés compris',
    run: onVps(VPS, async (vps) => {
      const d = await deployFresh(vps)
      const missing = lines(await vps.out(`cd ${d.base}/shared/config && for f in $(ls -A); do cmp -s "$f" ${d.base}/releases/2.11/config/"$f" || echo "$f"; done`))
      await cleanup(vps, d)
      return runFailure(d) ?? (missing.length ? fail(`Absent ou différent dans releases/2.11/config : ${missing.join(', ')}.`) : pass())
    }),
  },
  {
    id: 'retention',
    label: 'Seules les trois versions les plus récentes restent dans `releases/`',
    run: onVps(VPS, async (vps) => {
      const d = await deployFresh(vps)
      const s = await inspect(vps, d.base)
      await cleanup(vps, d)
      const failure = runFailure(d)
      if (failure) return failure
      return s.releases.join(' ') === '2.9 2.10 2.11' ? pass() : fail(`Versions restantes : ${s.releases.join(', ') || 'aucune'}.`)
    }),
  },
  {
    id: 'rerun',
    label: 'Relancer le script sur la même archive se termine sans erreur et donne le même résultat',
    run: onVps(VPS, async (vps) => {
      const d = await deployFresh(vps, 2)
      const s = await inspect(vps, d.base)
      const entries = lines(await vps.out(`ls -A ${d.base}/releases/2.11 | sort`))
      await cleanup(vps, d)
      const failure = runFailure(d)
      if (failure) return failure
      const expected = ['.htaccess', 'config', 'css', 'index.html']
      if (entries.join(' ') !== expected.join(' ')) return fail(`Après deux exécutions, releases/2.11 contient : ${entries.join(', ')}.`)
      if (s.current !== `${d.base}/releases/2.11` || s.releases.join(' ') !== '2.9 2.10 2.11') return fail('Après deux exécutions, current ou la liste des versions ne sont plus ceux d\'une seule exécution.')
      return pass()
    }),
  },
  {
    id: 'production',
    label: 'Sur `/srv/atelier`, la 2.11 est en ligne et la 2.10 est intacte pour un retour arrière',
    run: onVps(VPS, async (vps) => {
      const s = await inspect(vps, '/srv/atelier')
      if (s.current !== '/srv/atelier/releases/2.11' || !s.page.includes('version 2.11')) return fail(`/srv/atelier/current mène à ${s.current || 'un chemin inexistant'}${s.exists ? '' : ', qui n\'existe pas'}.`)
      const r = await vps.sh(`cd /srv/atelier/releases/2.10 && grep -q 'version 2.10' index.html && test -f .htaccess && cmp -s config/.env ../../shared/config/.env && cmp -s config/app.ini ../../shared/config/app.ini`)
      return r.code === 0 ? pass() : fail('/srv/atelier/releases/2.10 est absente ou incomplète (page, .htaccess ou configuration).')
    }),
  },
] satisfies Criterion[]
