import type { Criterion } from '#check'
import { fail, lines, onVps, pass, type Vps } from '../../../helpers.ts'

const VPS = 'dojo-linux-m4-i1'
const URI = 'file:/srv/depot-outils'

const sourceFiles = async (vps: Vps) => lines(await vps.out(`grep -rlE 'file:/+srv/depot-outils' /etc/apt/sources.list /etc/apt/sources.list.d 2>/dev/null`))

// apt-get update restricted to one source file: no network needed, only this repository is checked.
const scopedUpdate = (vps: Vps, file: string) =>
  vps.sh(`apt-get update -o Dir::Etc::sourcelist=${file} -o Dir::Etc::sourceparts=/nonexistent -o APT::Get::List-Cleanup=0 2>&1`, { timeoutMs: 60_000 })

export default [
  {
    id: 'installed',
    label: '`fabrique-outils` est installé depuis le dépôt de l\'éditeur et fonctionne',
    run: onVps(VPS, async (vps) => {
      const status = await vps.out(`dpkg-query -W -f='\${Status}' fabrique-outils 2>/dev/null`)
      if (status !== 'install ok installed') return fail(`fabrique-outils : ${status || 'non installé'}.`)
      const out = await vps.out('fabrique-outils')
      return out.includes('prêt') ? pass() : fail(`La commande fabrique-outils affiche : « ${out} ».`)
    }),
  },
  {
    id: 'signed-by',
    label: 'Le dépôt est déclaré avec la clé de l\'éditeur en `signed-by`, sans désactiver la vérification',
    run: onVps(VPS, async (vps) => {
      const files = await sourceFiles(vps)
      if (!files.length) return fail(`Aucun fichier de /etc/apt ne déclare ${URI}.`)
      for (const f of files) {
        const content = (await vps.readFile(f)) ?? ''
        if (/trusted\s*[=:]\s*yes/i.test(content)) return fail(`${f} désactive la vérification des signatures (trusted).`)
        const key = content.match(/signed-by\s*[=:]\s*([^\s\]]+)/i)?.[1]
        if (!key) return fail(`${f} ne désigne pas de clé avec signed-by.`)
        if (!(await vps.test(`test -f ${key}`))) return fail(`${f} désigne la clé ${key}, qui n'existe pas.`)
        if (key.startsWith('/etc/apt/trusted.gpg')) return fail(`La clé ${key} est rangée parmi les clés approuvées pour tous les dépôts.`)
      }
      return pass(`Déclaré dans ${files.join(', ')}.`)
    }),
  },
  {
    id: 'scoped',
    label: 'La clé de l\'éditeur n\'est pas approuvée pour les autres dépôts',
    run: onVps(VPS, async (vps) => {
      // A source without signed-by is only accepted if the publisher's key is trusted globally.
      await vps.sh(`printf 'Types: deb\\nURIs: ${URI}\\nSuites: stable\\nComponents: main\\n' > /tmp/dojo-sans-cle.sources`)
      const r = await scopedUpdate(vps, '/tmp/dojo-sans-cle.sources')
      await vps.sh('rm -f /tmp/dojo-sans-cle.sources')
      return /NO_PUBKEY/.test(r.stdout) ? pass() : fail('Un dépôt déclaré sans signed-by est accepté avec cette clé : elle est approuvée globalement.')
    }),
  },
  {
    id: 'update',
    label: 'La mise à jour de la liste des paquets de ce dépôt se fait sans erreur ni avertissement',
    run: onVps(VPS, async (vps) => {
      const files = await sourceFiles(vps)
      if (!files.length) return fail(`Aucun fichier de /etc/apt ne déclare ${URI}.`)
      for (const f of files) {
        const r = await scopedUpdate(vps, f)
        const problem = r.stdout.split('\n').find((l) => /^(W|E|Err):/.test(l))
        if (r.code !== 0 || problem) return fail(`apt-get update avec ${f} : ${problem ?? `code ${r.code}`}`)
      }
      return pass()
    }),
  },
] satisfies Criterion[]
