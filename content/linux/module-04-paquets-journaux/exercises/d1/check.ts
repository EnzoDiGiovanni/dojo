import type { Criterion } from '#check'
import { fail, onVps, pass } from '../../../helpers.ts'

const VPS = 'dojo-linux-m4-d1'

export default [
  {
    id: 'update',
    label: '`apt update` se termine sans erreur ni avertissement',
    run: onVps(VPS, async (vps) => {
      const r = await vps.sh('apt-get update 2>&1', { timeoutMs: 240_000 })
      const problem = r.stdout.split('\n').find((l) => /^(W|E|Err):/.test(l.trim()))
      return r.code === 0 && !problem ? pass() : fail(`apt-get update : ${problem?.trim().slice(0, 200) ?? `code ${r.code}`}`)
    }),
  },
  {
    id: 'audit',
    label: 'Aucun paquet n\'est dans un état incohérent',
    run: onVps(VPS, async (vps) => {
      const audit = await vps.out('dpkg --audit')
      return audit ? fail(`dpkg --audit : ${audit.split('\n').filter(Boolean).slice(0, 2).join(' ')}`) : pass()
    }),
  },
  {
    id: 'jq',
    label: '`jq` est installé et fonctionne',
    run: onVps(VPS, async (vps) => {
      const status = await vps.out(`dpkg-query -W -f='\${Status}' jq 2>/dev/null`)
      if (status !== 'install ok installed') return fail(`jq : ${status || 'non installé'}.`)
      return (await vps.out(`echo '{"a":42}' | jq .a`)) === '42' ? pass() : fail('jq ne s\'exécute pas correctement.')
    }),
  },
  {
    id: 'agent',
    label: '`fabrique-agent` est installé et configuré, et envoie ses métriques au collecteur de La Fabrique',
    run: onVps(VPS, async (vps) => {
      const status = await vps.out(`dpkg-query -W -f='\${Status}' fabrique-agent 2>/dev/null`)
      if (status !== 'install ok installed') return fail(`fabrique-agent : ${status || 'non installé'}.`)
      const out = await vps.out('fabrique-agent')
      return out.includes('metriques.lafabrique.test') ? pass() : fail(`fabrique-agent affiche : « ${out} ».`)
    }),
  },
  {
    id: 'security',
    label: 'Les mises à jour de sécurité d\'Ubuntu sont toujours disponibles, depuis des dépôts vérifiés',
    run: onVps(VPS, async (vps) => {
      const trusted = await vps.out(`grep -rliE 'trusted\\s*[=:]\\s*yes' /etc/apt/sources.list /etc/apt/sources.list.d 2>/dev/null`)
      if (trusted) return fail(`Vérification désactivée dans ${trusted.split('\n').join(', ')}.`)
      const policy = await vps.out('apt-cache policy')
      return /noble-security/.test(policy) ? pass() : fail('Aucun dépôt noble-security n\'est connu d\'APT.')
    }),
  },
] satisfies Criterion[]
