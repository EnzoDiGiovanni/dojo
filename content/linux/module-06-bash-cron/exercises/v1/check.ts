import type { Criterion } from '#check'
import { fail, lines, onVps, parseSystemCrontab, pass, q, runLikeCron, sameSchedule, type Vps } from '../../../helpers.ts'

const VPS = 'dojo-linux-m6-v1'
const SCRIPT = '/usr/local/bin/archiver-exports'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// A scratch exports folder owned by `exports`, with files of known ages.
async function fixture(vps: Vps): Promise<string> {
  const dir = await vps.out('mktemp -d /tmp/dojo-exports.XXXX')
  await vps.sh(`cd ${dir} && mkdir sous-dossier
    for spec in '40:ancien.csv' '75:clients 2025.csv' '5:recent.csv' '90:notes.txt' '90:sous-dossier/vieux.csv'; do
      age=\${spec%%:*}; f=\${spec#*:}; printf 'contenu de %s\\n' "$f" > "$f"; touch -d "$age days ago" "$f"
    done
    chown -R exports:exports ${dir} && chmod 755 ${dir}`)
  return dir
}

const runAs = (vps: Vps, dir: string, args = '') =>
  vps.sh(`cd / && setpriv --reuid=exports --regid=exports --init-groups env EXPORTS_DIR=${q(dir)} PATH=/usr/local/bin:/usr/bin:/bin ${SCRIPT} ${args}`, { timeoutMs: 60_000 })

const snapshot = async (vps: Vps, dir: string) => (await vps.out(`cd ${dir} && find . -type f | sort`)).trim()

export default [
  {
    id: 'archive',
    label: 'Les exports de plus de N jours sont compressés dans le dossier de leur mois, sans perte, et les autres fichiers ne bougent pas',
    run: onVps(VPS, async (vps) => {
      if (!(await vps.test(`test -x ${SCRIPT}`))) return fail(`${SCRIPT} est absent ou n'est pas exécutable.`)
      const dir = await fixture(vps)
      try {
        const months = Object.fromEntries(await Promise.all(['ancien.csv', 'clients 2025.csv'].map(async (f) => [f, await vps.out(`date -r ${q(`${dir}/${f}`)} +%Y-%m`)])))
        const r = await runAs(vps, dir, '30')
        if (r.code !== 0) return fail(`Le script sort avec le code ${r.code} : ${r.stderr.trim().split('\n').pop()}`)
        for (const [f, month] of Object.entries(months)) {
          const gz = `${dir}/archives/${month}/${f}.gz`
          if (await vps.test(`test -e ${q(`${dir}/${f}`)}`)) return fail(`${f} (vieux de plus de 30 jours) est toujours dans le dossier.`)
          if ((await vps.out(`zcat ${q(gz)} 2>/dev/null`)) !== `contenu de ${f}`) return fail(`archives/${month}/${f}.gz est absent ou son contenu diffère de l'original.`)
        }
        for (const f of ['recent.csv', 'notes.txt', 'sous-dossier/vieux.csv']) {
          if (!(await vps.test(`test -f ${q(`${dir}/${f}`)}`))) return fail(`${f} a été déplacé alors qu'il devait rester en place.`)
        }
        return pass()
      } finally {
        await vps.sh(`rm -rf ${dir}`)
      }
    }),
  },
  {
    id: 'args',
    label: 'Un argument invalide est refusé avec le code 2, sans rien déplacer',
    run: onVps(VPS, async (vps) => {
      if (!(await vps.test(`test -x ${SCRIPT}`))) return fail(`${SCRIPT} est absent ou n'est pas exécutable.`)
      const dir = await fixture(vps)
      try {
        const before = await snapshot(vps, dir)
        for (const args of ['trente', '-5', '3.5', '30 60']) {
          const r = await runAs(vps, dir, args)
          if (r.code !== 2) return fail(`« archiver-exports ${args} » sort avec le code ${r.code}.`)
        }
        return (await snapshot(vps, dir)) === before ? pass() : fail('Un appel invalide a déplacé des fichiers.')
      } finally {
        await vps.sh(`rm -rf ${dir}`)
      }
    }),
  },
  {
    id: 'lock',
    label: 'Pendant qu\'une autre exécution tient le verrou, le script s\'arrête aussitôt avec un code non nul, sans rien déplacer',
    run: onVps(VPS, async (vps) => {
      if (!(await vps.test(`test -x ${SCRIPT}`))) return fail(`${SCRIPT} est absent ou n'est pas exécutable.`)
      const dir = await fixture(vps)
      try {
        const before = await snapshot(vps, dir)
        // Held by `exports`, like a concurrent run (sticky /run/lock forbids opening another user's file).
        await vps.sh('(setpriv --reuid=exports --regid=exports --init-groups flock /run/lock/archiver-exports.lock sleep 7 >/dev/null 2>&1 &); sleep 0.5')
        const start = Date.now()
        const r = await vps.sh(`timeout 5 sh -c ${q(`EXPORTS_DIR=${dir} setpriv --reuid=exports --regid=exports --init-groups ${SCRIPT} 30`)}`, { timeoutMs: 20_000 })
        await sleep(Math.max(0, 7500 - (Date.now() - start)))
        if (r.code === 124) return fail('Pendant que le verrou est tenu, le script attend au lieu de s\'arrêter.')
        if (r.code === 0) return fail('Pendant que le verrou est tenu, le script réussit quand même.')
        return (await snapshot(vps, dir)) === before ? pass() : fail('Pendant que le verrou est tenu, des fichiers ont été déplacés.')
      } finally {
        await vps.sh(`rm -rf ${dir}`)
      }
    }),
  },
  {
    id: 'journal',
    label: 'Chaque exécution journalise le nombre de fichiers archivés',
    run: onVps(VPS, async (vps) => {
      if (!(await vps.test(`test -x ${SCRIPT}`))) return fail(`${SCRIPT} est absent ou n'est pas exécutable.`)
      const dir = await fixture(vps)
      try {
        const since = await vps.out('date "+%Y-%m-%d %H:%M:%S"')
        await sleep(1100)
        await runAs(vps, dir, '30')
        const logged = lines(await vps.out(`journalctl -t archiver-exports --since ${q(since)} --no-pager -o cat`))
        if (!logged.length) return fail('Aucun message avec l\'étiquette archiver-exports dans le journal.')
        return logged.some((l) => /\b2\b/.test(l)) ? pass() : fail(`Message journalisé pour 2 fichiers archivés : « ${logged.pop()} ».`)
      } finally {
        await vps.sh(`rm -rf ${dir}`)
      }
    }),
  },
  {
    id: 'cron',
    label: 'La tâche est planifiée chaque jour à 3 h 15 avec le compte `exports`, et, lancée comme cron le ferait, ajoute sa sortie à `/var/log/exports/archiver.log`',
    run: onVps(VPS, async (vps) => {
      const content = await vps.readFile('/etc/cron.d/exports')
      if (content === null) return fail('/etc/cron.d/exports n\'existe pas.')
      const { jobs, unterminated } = parseSystemCrontab(content)
      const j = jobs.find((x) => x.command.includes('archiver-exports'))
      if (!j) return fail(unterminated ? '/etc/cron.d/exports ne se termine pas par un saut de ligne.' : 'Aucune ligne ne lance archiver-exports.')
      if (j.user !== 'exports') return fail(`La tâche est lancée avec le compte ${j.user}.`)
      if (!sameSchedule(j.schedule, '15 3 * * *')) return fail(`Calendrier : ${j.schedule.join(' ')}.`)
      const log = '/var/log/exports/archiver.log'
      const before = Number(await vps.out(`wc -l < ${log} 2>/dev/null || echo 0`))
      const r = await runLikeCron(vps, j)
      const after = Number(await vps.out(`wc -l < ${log} 2>/dev/null || echo 0`))
      return after > before ? pass() : fail(`Après une exécution comme cron, ${log} n'a pas grandi${r.stderr.trim() ? ` ; erreur : « ${r.stderr.trim().split('\n')[0]} »` : ''}.`)
    }),
  },
] satisfies Criterion[]
