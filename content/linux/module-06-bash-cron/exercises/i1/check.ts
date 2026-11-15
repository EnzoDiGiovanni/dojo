import type { Criterion } from '#check'
import { fail, lines, onVps, parseSystemCrontab, pass, sameSchedule, type Vps } from '../../../helpers.ts'

const VPS = 'dojo-linux-m6-i1'
const SCRIPT = '/usr/local/sbin/sauvegarde-sites'
const DIR = '/var/backups/sites'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const archives = async (vps: Vps) => lines(await vps.out(`ls -1 ${DIR} 2>/dev/null | grep -E '^sites-[0-9]{8}-[0-9]{6}\\.tar\\.gz$' | sort`))
const missing = async (vps: Vps) => ((await vps.test(`test -x ${SCRIPT}`)) ? null : fail(`${SCRIPT} est absent ou n'est pas exécutable.`))

export default [
  {
    id: 'archive',
    label: 'Chaque exécution crée une archive complète et datée de `/srv/sites` dans `/var/backups/sites`',
    run: onVps(VPS, async (vps) => {
      const absent = await missing(vps)
      if (absent) return absent
      const before = await archives(vps)
      await sleep(1100)
      const r = await vps.sh(SCRIPT, { timeoutMs: 60_000 })
      if (r.code !== 0) return fail(`Le script sort avec le code ${r.code} : ${r.stderr.trim().split('\n').pop()}`)
      const created = (await archives(vps)).filter((a) => !before.includes(a))
      if (created.length !== 1) return fail(`${created.length} archive(s) au nom attendu créée(s) par une exécution.`)
      const listing = lines(await vps.out(`tar -tzf ${DIR}/${created[0]}`))
      const expected = lines(await vps.out(`cd /srv/sites && find . -type f | sed 's|^\\./||'`))
      const absentFiles = expected.filter((f) => !listing.some((l) => l === f || l.endsWith(`/${f}`)))
      return absentFiles.length ? fail(`${created[0]} ne contient pas : ${absentFiles.slice(0, 2).join(', ')}${absentFiles.length > 2 ? '…' : ''}.`) : pass(created[0])
    }),
  },
  {
    id: 'rotation',
    label: 'Seules les 7 archives les plus récentes sont conservées',
    run: onVps(VPS, async (vps) => {
      const absent = await missing(vps)
      if (absent) return absent
      const made: string[] = []
      for (let i = 0; i < 8; i++) {
        await sleep(1100)
        const before = await archives(vps)
        if ((await vps.sh(SCRIPT, { timeoutMs: 60_000 })).code !== 0) return fail(`L'exécution n°${i + 1} échoue.`)
        made.push(...(await archives(vps)).filter((a) => !before.includes(a)))
      }
      const now = await archives(vps)
      if (now.length !== 7) return fail(`Après 8 exécutions, ${now.length} archive(s) dans ${DIR}.`)
      return now.join() === made.slice(-7).join() ? pass() : fail(`Archives gardées : ${now[0]} … ${now[now.length - 1]} ; ce ne sont pas les 7 plus récentes.`)
    }),
  },
  {
    id: 'lock',
    label: 'Si une sauvegarde est déjà en cours, une nouvelle exécution s\'arrête aussitôt avec un code non nul, sans créer d\'archive',
    run: onVps(VPS, async (vps) => {
      const absent = await missing(vps)
      if (absent) return absent
      await vps.sh('mkdir -p /run/lock && (flock /run/lock/sauvegarde-sites.lock sleep 8 >/dev/null 2>&1 &) ; sleep 0.5')
      const before = await archives(vps)
      const start = Date.now()
      const r = await vps.sh(`timeout 5 ${SCRIPT}`, { timeoutMs: 20_000 })
      const took = Date.now() - start
      const after = await archives(vps)
      await sleep(Math.max(0, 8500 - took))
      if (r.code === 124) return fail('Pendant qu\'une sauvegarde tient le verrou, le script attend au lieu de s\'arrêter.')
      if (r.code === 0) return fail('Pendant qu\'une sauvegarde tient le verrou, le script réussit quand même.')
      return after.length === before.length ? pass() : fail('Pendant qu\'une sauvegarde tient le verrou, une archive a quand même été créée.')
    }),
  },
  {
    id: 'failure',
    label: 'En cas d\'échec, le script sort avec un code non nul et ne laisse aucune archive incomplète',
    run: onVps(VPS, async (vps) => {
      const absent = await missing(vps)
      if (absent) return absent
      const before = lines(await vps.out(`ls -1 ${DIR}`))
      await vps.sh('mv /srv/sites /srv/.sites-dojo')
      let r
      try {
        await sleep(1100)
        r = await vps.sh(SCRIPT, { timeoutMs: 60_000 })
      } finally {
        await vps.sh('test -d /srv/.sites-dojo && mv /srv/.sites-dojo /srv/sites')
      }
      const extra = lines(await vps.out(`ls -1 ${DIR}`)).filter((f) => !before.includes(f))
      if (r.code === 0) return fail('Avec /srv/sites introuvable, le script sort avec le code 0.')
      return extra.length ? fail(`Après l'échec, il reste dans ${DIR} : ${extra.join(', ')}.`) : pass()
    }),
  },
  {
    id: 'journal-cron',
    label: 'Chaque sauvegarde réussie est journalisée, et la tâche est planifiée chaque nuit à 2 h 30 en root',
    run: onVps(VPS, async (vps) => {
      const last = (await archives(vps)).pop()
      if (!last) return fail(`Aucune archive dans ${DIR}.`)
      if (!(await vps.test(`journalctl -t sauvegarde-sites --no-pager -o cat | grep -qF ${last}`))) return fail(`Le journal (étiquette sauvegarde-sites) ne mentionne pas ${last}.`)
      const content = await vps.readFile('/etc/cron.d/sauvegarde')
      if (content === null) return fail('/etc/cron.d/sauvegarde n\'existe pas.')
      const { jobs, unterminated } = parseSystemCrontab(content)
      const job = jobs.find((j) => j.command.includes('sauvegarde-sites'))
      if (!job) return fail(unterminated ? '/etc/cron.d/sauvegarde ne se termine pas par un saut de ligne.' : 'Aucune ligne de /etc/cron.d/sauvegarde ne lance sauvegarde-sites.')
      if (job.user !== 'root') return fail(`La tâche est lancée avec le compte ${job.user}.`)
      if (!sameSchedule(job.schedule, '30 2 * * *')) return fail(`Calendrier : ${job.schedule.join(' ')}.`)
      return job.command.trim().startsWith('/') || job.env.PATH?.includes('/usr/local/sbin') ? pass() : fail(`La commande « ${job.command} » serait introuvable avec le PATH de cron.`)
    }),
  },
] satisfies Criterion[]
