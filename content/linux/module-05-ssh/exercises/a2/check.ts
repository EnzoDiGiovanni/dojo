import type { Criterion } from '#check'
import path from 'node:path'
import { fail, onVps, pass } from '../../../helpers.ts'

const VPS = 'dojo-linux-m5-a2'

export default [
  {
    id: 'config',
    label: '`ssh_config` décrit l\'hôte `fabrique` : compte `deploy`, adresse 127.0.0.1, port 47552, ta clé de `cles/` et seulement elle',
    async run(ctx) {
      if ((await ctx.readFile('ssh_config')) === null) return fail('ssh_config est absent.')
      const r = await ctx.exec('ssh', ['-G', '-F', 'ssh_config', 'fabrique'], { cwd: ctx.dir })
      if (r.code !== 0) return fail(`ssh -G refuse ce fichier : ${r.stderr.trim().split('\n')[0]}`)
      const opts = new Map<string, string[]>()
      for (const line of r.stdout.split('\n')) {
        const [k, ...v] = line.split(' ')
        opts.set(k, [...(opts.get(k) ?? []), v.join(' ')])
      }
      const one = (k: string) => opts.get(k)?.[0]
      if (one('user') !== 'deploy') return fail(`Compte utilisé : ${one('user')}.`)
      if (!['127.0.0.1', 'localhost'].includes(one('hostname') ?? '')) return fail(`Adresse utilisée : ${one('hostname')}.`)
      if (one('port') !== '47552') return fail(`Port utilisé : ${one('port')}.`)
      if (one('identitiesonly') !== 'yes') return fail('Le client proposera aussi d\'autres clés que la tienne (IdentitiesOnly).')
      const home = process.env.HOME ?? ''
      const expected = path.join(ctx.dir, 'cles', 'id_ed25519')
      const files = (opts.get('identityfile') ?? []).map((f) => path.resolve(ctx.dir, f.replace(/^~/, home)))
      return files.length === 1 && files[0] === expected ? pass() : fail(`Clé(s) proposée(s) : ${files.join(', ') || 'aucune'}.`)
    },
  },
  {
    id: 'authorized',
    label: 'Ta clé publique est autorisée pour `deploy`',
    run: onVps(VPS, async (vps, ctx) => {
      const pub = (await ctx.readFile('cles/id_ed25519.pub'))?.trim().split(/\s+/).slice(0, 2).join(' ')
      if (!pub) return fail('cles/id_ed25519.pub est absente.')
      const keys = (await vps.readFile('/home/deploy/.ssh/authorized_keys')) ?? ''
      return keys.includes(pub) ? pass() : fail('Ta clé publique n\'est pas dans /home/deploy/.ssh/authorized_keys.')
    }),
  },
  {
    id: 'upload',
    label: '`rapport-2026.pdf` est sur le serveur dans `/srv/echange/`, identique à l\'original',
    run: onVps(VPS, async (vps, ctx) => {
      const local = (await ctx.exec('sha256sum', [`${ctx.dir}/rapport-2026.pdf`])).stdout.split(' ')[0]
      if (!local) return fail('rapport-2026.pdf a disparu de ce dossier.')
      const remote = (await vps.out('sha256sum /srv/echange/rapport-2026.pdf 2>/dev/null')).split(' ')[0]
      if (!remote) return fail('/srv/echange/rapport-2026.pdf n\'existe pas sur le serveur.')
      return remote === local ? pass() : fail('Le fichier du serveur diffère de l\'original.')
    }),
  },
  {
    id: 'download',
    label: '`export-clients.csv` est dans ce dossier, identique à celui du serveur',
    run: onVps(VPS, async (vps, ctx) => {
      const local = await ctx.exec('sha256sum', [`${ctx.dir}/export-clients.csv`])
      if (local.code !== 0) return fail('export-clients.csv n\'est pas dans ce dossier.')
      const remote = (await vps.out('sha256sum /srv/echange/export-clients.csv')).split(' ')[0]
      return local.stdout.split(' ')[0] === remote ? pass() : fail('Le fichier rapatrié diffère de celui du serveur.')
    }),
  },
] satisfies Criterion[]
