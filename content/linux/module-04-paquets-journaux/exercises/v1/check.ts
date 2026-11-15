import type { Criterion } from '#check'
import { fail, lines, onVps, pass, type Vps } from '../../../helpers.ts'

const VPS = 'dojo-linux-m4-v1'
const URI = 'file:/srv/depot-partenaire'
const RULE = '/etc/logrotate.d/mailer'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const scopedUpdate = (vps: Vps, file: string) =>
  vps.sh(`apt-get update -o Dir::Etc::sourcelist=${file} -o Dir::Etc::sourceparts=/nonexistent -o APT::Get::List-Cleanup=0 2>&1`, { timeoutMs: 60_000 })

export default [
  {
    id: 'installed',
    label: '`partenaire-mailer` est installé depuis son dépôt, déclaré avec sa clé en `signed-by` et sans désactiver la vérification, et son service tourne',
    run: onVps(VPS, async (vps) => {
      const status = await vps.out(`dpkg-query -W -f='\${Status}' partenaire-mailer 2>/dev/null`)
      if (!/ ok installed$/.test(status)) return fail(`partenaire-mailer : ${status || 'non installé'}.`)
      const files = lines(await vps.out(`grep -rlE 'file:/+srv/depot-partenaire' /etc/apt/sources.list /etc/apt/sources.list.d 2>/dev/null`))
      if (!files.length) return fail(`Aucun fichier de /etc/apt ne déclare ${URI}.`)
      for (const f of files) {
        const content = (await vps.readFile(f)) ?? ''
        if (/trusted\s*[=:]\s*yes/i.test(content)) return fail(`${f} désactive la vérification des signatures.`)
        const key = content.match(/signed-by\s*[=:]\s*([^\s\]]+)/i)?.[1]
        if (!key || !(await vps.test(`test -f ${key}`))) return fail(`${f} ne désigne pas de clé existante avec signed-by.`)
        const r = await scopedUpdate(vps, f)
        const problem = r.stdout.split('\n').find((l) => /^(W|E|Err):/.test(l))
        if (problem) return fail(`apt-get update avec ${f} : ${problem}`)
      }
      const active = await vps.out('systemctl is-active partenaire-mailer')
      return active === 'active' ? pass() : fail(`Le service partenaire-mailer est ${active}.`)
    }),
  },
  {
    id: 'scoped',
    label: 'La clé du partenaire n\'est pas approuvée pour les autres dépôts',
    run: onVps(VPS, async (vps) => {
      await vps.sh(`printf 'Types: deb\\nURIs: ${URI}\\nSuites: stable\\nComponents: main\\n' > /tmp/dojo-sans-cle.sources`)
      const r = await scopedUpdate(vps, '/tmp/dojo-sans-cle.sources')
      await vps.sh('rm -f /tmp/dojo-sans-cle.sources')
      return /NO_PUBKEY/.test(r.stdout) ? pass() : fail('Un dépôt déclaré sans signed-by est accepté avec cette clé : elle est approuvée globalement.')
    }),
  },
  {
    id: 'hold',
    label: '`partenaire-mailer` ne changera pas de version lors des mises à jour',
    run: onVps(VPS, async (vps) => {
      const held = (await vps.out('apt-mark showhold')).split('\n')
      if (held.includes('partenaire-mailer')) return pass()
      const pin = await vps.out(`apt-cache policy partenaire-mailer | sed -n 's/.*\\*\\*\\* [^ ]* \\([0-9-]*\\).*/\\1/p'`)
      return Number(pin) >= 1000 ? pass('Épinglé par une préférence APT.') : fail('partenaire-mailer n\'est ni retenu ni épinglé.')
    }),
  },
  {
    id: 'incident',
    label: '`incident.txt` donne le relais SMTP injoignable et le code de sortie du premier arrêt du service',
    run: onVps(VPS, async (vps) => {
      const content = await vps.readFile('/home/ubuntu/incident.txt')
      if (content === null) return fail('/home/ubuntu/incident.txt n\'existe pas.')
      const value = (k: string) => content.match(new RegExp(`^\\s*${k}\\s*=\\s*(.*?)\\s*$`, 'm'))?.[1]?.replace(/^["'«]\s*|\s*["'»]$/g, '')
      const wrong = []
      if (value('relais') !== 'smtp.partenaire.test:587') wrong.push(`relais=${value('relais') ?? '(absent)'}`)
      if (value('code') !== '75') wrong.push(`code=${value('code') ?? '(absent)'}`)
      return wrong.length ? fail(`Valeur(s) inexacte(s) ou absente(s) : ${wrong.join(', ')}.`) : pass()
    }),
  },
  {
    id: 'rotation',
    label: 'Les journaux de `/var/log/mailer` tournent chaque semaine, 8 anciens sont gardés compressés, et le mailer écrit dans un journal neuf après une rotation',
    run: onVps(VPS, async (vps) => {
      if (!(await vps.test(`test -f ${RULE}`))) return fail(`${RULE} n'existe pas.`)
      const debug = await vps.out(`logrotate -d -s /tmp/dojo-logrotate.state ${RULE} 2>&1`)
      const error = debug.split('\n').find((l) => /^error/i.test(l.trim()))
      if (error) return fail(`logrotate -d : ${error}`)
      if (!debug.includes('considering log /var/log/mailer/mailer.log')) return fail('La règle ne concerne pas /var/log/mailer/mailer.log.')
      const policy = debug.match(/rotating pattern: .*?(weekly|after \d+ days)[^(]*\((\d+) rotations\)/)
      if (!policy || policy[1] !== 'weekly' || policy[2] !== '8') return fail(`Simulation : ${debug.split('\n').find((l) => l.startsWith('rotating pattern')) ?? 'aucune règle lue'}.`)
      const rule = (await vps.readFile(RULE)) ?? ''
      if (!/^\s*compress\b/m.test(rule) || /^\s*copytruncate\b/m.test(rule)) return fail('La règle ne compresse pas, ou utilise copytruncate.')
      const r = await vps.sh(`logrotate -f -s /tmp/dojo-logrotate.state ${RULE} 2>&1`)
      if (r.code !== 0) return fail(`La rotation forcée échoue : ${r.stdout.trim().split('\n').pop()}`)
      await sleep(1500)
      const size = () => vps.out('stat -c %s /var/log/mailer/mailer.log 2>/dev/null || echo 0')
      const before = Number(await size())
      await sleep(2500)
      const after = Number(await size())
      return after > before ? pass() : fail(`Après la rotation, mailer.log ne grossit pas (${after} octets).`)
    }),
  },
] satisfies Criterion[]
