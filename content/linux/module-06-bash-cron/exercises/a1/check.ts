import type { Criterion } from '#check'
import { fail, onVps, pass, q } from '../../../helpers.ts'

const VPS = 'dojo-linux-m6-a1'
const run = (args: string) => `cd /tmp && creer-site ${args}`

export default [
  {
    id: 'usage',
    label: 'Sans argument, avec trop d\'arguments ou avec un nom invalide, le script affiche un usage sur la sortie d\'erreur et sort avec le code 2',
    run: onVps(VPS, async (vps) => {
      for (const args of ['', 'un deux', q('Mon Site'), '../etc', q('Boutique'), 'site_2']) {
        const r = await vps.as('ubuntu', run(args))
        const call = `creer-site ${args}`.trim()
        if (r.code !== 2) return fail(`« ${call} » sort avec le code ${r.code}${r.code === 127 ? ' (commande introuvable)' : ''}.`)
        if (r.stdout.trim()) return fail(`« ${call} » écrit sur la sortie standard : « ${r.stdout.trim().slice(0, 60)} ».`)
        if (!r.stderr.trim()) return fail(`« ${call} » n'écrit rien sur la sortie d'erreur.`)
      }
      return (await vps.test('test ! -e /etc/public && test ! -e "/srv/sites/Mon Site"')) ? pass() : fail('Un nom invalide a quand même créé un dossier.')
    }),
  },
  {
    id: 'create',
    label: 'Avec un nom valide, il crée l\'arborescence du site et sa page, affiche le chemin et sort avec le code 0',
    run: onVps(VPS, async (vps) => {
      const name = `essai-${Date.now().toString(36)}`
      const dir = `/srv/sites/${name}`
      try {
        const r = await vps.as('ubuntu', run(name))
        if (r.code !== 0) return fail(`« creer-site ${name} » sort avec le code ${r.code} : ${r.stderr.trim().split('\n')[0]}`)
        if (!r.stdout.includes(dir)) return fail(`La sortie standard ne contient pas le chemin du site : « ${r.stdout.trim().slice(0, 80)} ».`)
        if (!(await vps.test(`test -d ${dir}/public && test -d ${dir}/logs`))) return fail('public/ ou logs/ manque dans le site créé.')
        return (await vps.test(`grep -q 'Site ${name}' ${dir}/public/index.html`)) ? pass() : fail('public/index.html est absent ou ne contient pas « Site <nom> ».')
      } finally {
        await vps.sh(`rm -rf ${dir}`)
      }
    }),
  },
  {
    id: 'existing',
    label: 'Sur un site existant, il sort avec le code 1, un message sur la sortie d\'erreur, sans rien modifier',
    run: onVps(VPS, async (vps) => {
      const before = await vps.out('cd /srv/sites/vitrine && find . -type f -exec sha256sum {} + | sort')
      const r = await vps.as('ubuntu', run('vitrine'))
      const after = await vps.out('cd /srv/sites/vitrine && find . -type f -exec sha256sum {} + | sort')
      if (after !== before) return fail('Le site existant a été modifié.')
      if (r.code !== 1) return fail(`« creer-site vitrine » sort avec le code ${r.code}.`)
      return r.stderr.trim() ? pass() : fail('Aucun message sur la sortie d\'erreur.')
    }),
  },
  {
    id: 'path',
    label: '`creer-site` se lance par son nom, depuis n\'importe quel dossier, par tous les utilisateurs',
    run: onVps(VPS, async (vps) => {
      for (const u of ['ubuntu', 'lea']) {
        const where = await vps.as(u, 'cd / && command -v creer-site')
        if (where.code !== 0) return fail(`Pour ${u}, la commande creer-site est introuvable.`)
        if ((await vps.as(u, 'cd / && creer-site >/dev/null 2>&1; echo $?')).stdout.trim() === '126') return fail(`${u} ne peut pas exécuter ${where.stdout.trim()}.`)
      }
      return pass()
    }),
  },
] satisfies Criterion[]
