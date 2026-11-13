import type { Criterion } from '#check'
import { fail, onVps, pass } from '../../../helpers.ts'

const VPS = 'dojo-linux-m5-a1'
const USER = 'deploy'

export default [
  {
    id: 'pair',
    label: '`cles/` contient une paire de clés ed25519, et la clé privée n\'est lisible que par toi',
    async run(ctx) {
      const priv = `${ctx.dir}/cles/id_ed25519`
      const info = await ctx.exec('ssh-keygen', ['-lf', `${priv}.pub`])
      if (info.code !== 0) return fail('cles/id_ed25519.pub est absente ou n\'est pas une clé publique.')
      if (!/\(ED25519\)\s*$/.test(info.stdout.trim())) return fail(`Type de clé : ${info.stdout.trim().split(' ').pop()}.`)
      const mode = await ctx.exec('stat', ['-c', '%a', priv])
      if (mode.code !== 0) return fail('cles/id_ed25519 (clé privée) est absente.')
      return /^[46]00$/.test(mode.stdout.trim()) ? pass() : fail(`Droits de la clé privée : ${mode.stdout.trim()}.`)
    },
  },
  {
    id: 'passphrase',
    label: 'La clé privée est protégée par une phrase de passe',
    async run(ctx) {
      if ((await ctx.readFile('cles/id_ed25519')) === null) return fail('cles/id_ed25519 (clé privée) est absente.')
      const r = await ctx.exec('ssh-keygen', ['-y', '-P', '', '-f', `${ctx.dir}/cles/id_ed25519`])
      if (r.code === 0) return fail('La clé privée s\'ouvre sans phrase de passe.')
      return /passphrase/i.test(r.stderr) ? pass() : fail(`Clé privée illisible : ${r.stderr.trim().split('\n')[0]}`)
    },
  },
  {
    id: 'authorized',
    label: 'La clé publique est autorisée pour `deploy`, avec des droits que sshd accepte',
    run: onVps(VPS, async (vps, ctx) => {
      const pub = (await ctx.readFile('cles/id_ed25519.pub'))?.trim().split(/\s+/).slice(0, 2).join(' ')
      if (!pub) return fail('cles/id_ed25519.pub est absente.')
      const keys = (await vps.readFile(`/home/${USER}/.ssh/authorized_keys`)) ?? ''
      if (!keys.split('\n').some((l) => l.includes(pub))) return fail(`Ta clé publique n'est pas, entière sur une ligne, dans /home/${USER}/.ssh/authorized_keys.`)
      const r = await vps.out(`stat -c '%n %U %a' /home/${USER} /home/${USER}/.ssh /home/${USER}/.ssh/authorized_keys`)
      for (const line of r.split('\n')) {
        const [path, owner, mode] = line.split(' ')
        if (owner !== USER || (parseInt(mode, 8) & 0o022) !== 0) return fail(`${path} : propriétaire ${owner}, droits ${mode}.`)
      }
      return pass()
    }),
  },
  {
    id: 'login',
    label: 'Une connexion au compte `deploy` avec cette clé apparaît dans les journaux du serveur',
    run: onVps(VPS, async (vps, ctx) => {
      const info = await ctx.exec('ssh-keygen', ['-lf', `${ctx.dir}/cles/id_ed25519.pub`])
      const fingerprint = info.stdout.split(' ')[1]
      if (!fingerprint) return fail('cles/id_ed25519.pub est absente.')
      const accepted = await vps.out(`journalctl -t sshd --no-pager -o cat | grep 'Accepted publickey for ${USER} ' | tail -n 50`)
      if (accepted.includes(fingerprint)) return pass()
      const refused = await vps.out(`journalctl -t sshd --no-pager -o cat | grep -iE 'refused|Connection closed by authenticating user ${USER}' | tail -n 1`)
      return fail(`Aucune connexion de ${USER} avec la clé ${fingerprint} dans le journal${refused ? ` ; dernier refus : « ${refused.slice(0, 120)} »` : ''}.`)
    }),
  },
] satisfies Criterion[]
