import type { Criterion } from '#check'
import { fail, onVps, parseSystemCrontab, pass, runLikeCron, sameSchedule, type Vps } from '../../../helpers.ts'

const VPS = 'dojo-linux-m6-a2'
const FILE = '/etc/cron.d/vitrine'
const LOG = '/var/log/vitrine/purge.log'

async function purgeJob(vps: Vps) {
  const content = await vps.readFile(FILE)
  if (content === null) return { error: `${FILE} n'existe pas.` }
  const { jobs, unterminated } = parseSystemCrontab(content)
  const job = jobs.find((j) => j.command.includes('purge-cache'))
  if (!job) return { error: unterminated ? `${FILE} ne se termine pas par un saut de ligne : cron ignore sa dernière ligne.` : `Aucune ligne de ${FILE} ne lance purge-cache.` }
  return { job }
}

export default [
  {
    id: 'file',
    label: 'cron accepte le fichier `/etc/cron.d/vitrine`, qui lance la purge toutes les 15 minutes avec le compte `www-data`',
    run: onVps(VPS, async (vps) => {
      const { job, error } = await purgeJob(vps)
      if (!job) return fail(error!)
      const [owner, mode] = (await vps.out(`stat -c '%U %a' ${FILE}`)).split(' ')
      if (owner !== 'root' || (parseInt(mode, 8) & 0o022) !== 0) return fail(`${FILE} : propriétaire ${owner}, droits ${mode} ; cron l'ignorerait.`)
      if (job.user !== 'www-data') return fail(`La purge est lancée avec le compte ${job.user}.`)
      return sameSchedule(job.schedule, '*/15 * * * *') ? pass() : fail(`Calendrier de la purge : ${job.schedule.join(' ')}.`)
    }),
  },
  {
    id: 'log',
    label: 'Lancée exactement comme cron le ferait, la purge ajoute sa sortie et ses erreurs à `/var/log/vitrine/purge.log`',
    run: onVps(VPS, async (vps) => {
      const { job, error } = await purgeJob(vps)
      if (!job) return fail(error!)
      const before = await vps.out(`wc -l < ${LOG} 2>/dev/null || echo 0`)
      const r = await runLikeCron(vps, job)
      const content = (await vps.readFile(LOG)) ?? ''
      const lines = content.split('\n').filter(Boolean)
      if (!lines.length) return fail(`Après l'exécution, ${LOG} est absent ou vide${r.stderr.trim() ? ` ; erreur : « ${r.stderr.trim().split('\n')[0]} »` : ''}.`)
      if (Number(before) > 0 && lines.length <= Number(before)) return fail(`${LOG} n'a pas grandi : la sortie l'écrase ou ne l'atteint pas.`)
      if (!content.includes('purge du cache : www-data')) return fail(`${LOG} ne contient pas la sortie de la purge lancée par www-data.`)
      return content.includes('No such file') || content.includes('cannot access') ? pass() : fail(`Les messages d'erreur de la purge n'arrivent pas dans ${LOG}.`)
    }),
  },
  {
    id: 'lea',
    label: 'La crontab de `lea` lance `rapport-hebdo` chaque lundi à 7 h 30',
    run: onVps(VPS, async (vps) => {
      const tab = await vps.sh('crontab -l -u lea 2>&1')
      if (tab.code !== 0) return fail('lea n\'a pas de crontab.')
      const line = tab.stdout.split('\n').find((l) => !l.trim().startsWith('#') && l.includes('rapport-hebdo'))
      if (!line) return fail('Aucune ligne de la crontab de lea ne lance rapport-hebdo.')
      const fields = line.trim().split(/\s+/)
      return sameSchedule(fields.slice(0, 5), '30 7 * * 1') ? pass() : fail(`Calendrier du rapport : ${fields.slice(0, 5).join(' ')}.`)
    }),
  },
] satisfies Criterion[]
