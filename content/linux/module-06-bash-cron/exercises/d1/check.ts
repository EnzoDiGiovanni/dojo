import type { Criterion } from '#check'
import { fail, lines, onVps, parseSystemCrontab, pass, runLikeCron, sameSchedule, type Vps } from '../../../helpers.ts'

const VPS = 'dojo-linux-m6-d1'
const FILE = '/etc/cron.d/sauvegarde-nuit'
const DEST = '/var/backups/boutique'

async function job(vps: Vps) {
  const content = await vps.readFile(FILE)
  if (content === null) return { error: `${FILE} n'existe pas.` }
  const { jobs, unterminated } = parseSystemCrontab(content)
  const found = jobs.find((j) => j.command.includes('sauvegarde-boutique'))
  if (!found) return { error: unterminated ? `cron ignore la dernière ligne de ${FILE} : le fichier ne se termine pas par un saut de ligne.` : `Aucune ligne de ${FILE} ne lance sauvegarde-boutique.` }
  return { job: found }
}

const archives = async (vps: Vps) => lines(await vps.out(`ls -1 ${DEST} 2>/dev/null`))

export default [
  {
    id: 'scheduled',
    label: 'cron prend en compte la tâche, planifiée chaque nuit à 2 h 30 avec le compte root',
    run: onVps(VPS, async (vps) => {
      const { job: j, error } = await job(vps)
      if (!j) return fail(error!)
      const [owner, mode] = (await vps.out(`stat -c '%U %a' ${FILE}`)).split(' ')
      if (owner !== 'root' || (parseInt(mode, 8) & 0o022) !== 0) return fail(`${FILE} : propriétaire ${owner}, droits ${mode}.`)
      if (j.user !== 'root') return fail(`La tâche est lancée avec le compte ${j.user}.`)
      return sameSchedule(j.schedule, '30 2 * * *') ? pass() : fail(`Calendrier : ${j.schedule.join(' ')}.`)
    }),
  },
  {
    id: 'archive',
    label: 'Exécutée exactement comme cron le ferait, la tâche crée une archive complète des données de la boutique',
    run: onVps(VPS, async (vps) => {
      const { job: j, error } = await job(vps)
      if (!j) return fail(error!)
      const before = await archives(vps)
      const r = await runLikeCron(vps, j)
      const created = (await archives(vps)).filter((a) => !before.includes(a))
      if (!created.length) {
        const today = await vps.out('date +%F')
        const log = (await vps.readFile(`/var/log/sauvegarde-boutique-${today}.log`))?.trim().split('\n').pop()
        return fail(`Aucune archive créée${log ? ` ; journal de la tâche : « ${log.slice(0, 120)} »` : r.stderr.trim() ? ` ; erreur : « ${r.stderr.trim().split('\n')[0].slice(0, 120)} »` : ''}.`)
      }
      const listing = lines(await vps.out(`tar -tzf ${DEST}/${created[created.length - 1]} 2>/dev/null`)).map((l) => l.replace(/^\.\//, ''))
      const expected = lines(await vps.out(`cd /srv/boutique/data && find . -type f | sed 's|^\\./||'`))
      const absent = expected.filter((f) => !listing.some((l) => l === f || l.endsWith(`/${f}`)))
      return absent.length ? fail(`L'archive ne contient pas : ${absent.join(', ')}.`) : pass(created[created.length - 1])
    }),
  },
  {
    id: 'log',
    label: 'Le journal de la tâche est écrit dans `/var/log/sauvegarde-boutique-<date du jour>.log`',
    run: onVps(VPS, async (vps) => {
      const { job: j, error } = await job(vps)
      if (!j) return fail(error!)
      const today = await vps.out('date +%F')
      const file = `/var/log/sauvegarde-boutique-${today}.log`
      await vps.sh(`rm -f ${file}`)
      await runLikeCron(vps, j)
      const content = await vps.readFile(file)
      if (content === null) return fail(`${file} n'a pas été créé (fichiers trouvés : ${(await vps.out("ls /var/log | grep sauvegarde-boutique | head -n 3 | tr '\\n' ' '")) || 'aucun'}).`)
      return content.includes('sauvegarde terminée') ? pass() : fail(`${file} contient : « ${content.trim().split('\n').pop()?.slice(0, 120)} ».`)
    }),
  },
  {
    id: 'manual',
    label: 'Le script fonctionne toujours quand root le lance à la main',
    run: onVps(VPS, async (vps) => {
      const before = await archives(vps)
      const r = await vps.sh('cd /root && bash -ic "sauvegarde-boutique" 2>&1')
      const created = (await archives(vps)).filter((a) => !before.includes(a))
      return r.code === 0 && created.length ? pass() : fail(`Lancé à la main par root : code ${r.code}, « ${r.stdout.trim().split('\n').pop()?.slice(0, 120)} ».`)
    }),
  },
] satisfies Criterion[]
