// Shared building blocks for Linux check.ts files. Every exercise runs on its own "VPS": a systemd
// Ubuntu container started by the exercise's `vps.sh`, inspected here through `docker exec`.
import type { CheckContext, CheckOutcome, ExecResult } from '#check'

export const pass = (observed?: string): CheckOutcome => ({ ok: true, ...(observed ? { observed } : {}) })
export const fail = (observed: string): CheckOutcome => ({ ok: false, observed })

export interface Vps {
  name: string
  /** Runs a bash script on the server as root. */
  sh(script: string, opts?: { timeoutMs?: number; stdin?: string }): Promise<ExecResult>
  /** Runs a bash script as `user`, with the user's groups and a login-like environment. */
  as(user: string, script: string, opts?: { timeoutMs?: number }): Promise<ExecResult>
  /** Trimmed stdout of a root script. */
  out(script: string): Promise<string>
  /** True when a root script exits with code 0. */
  test(script: string): Promise<boolean>
  /** Content of a file on the server, null if missing. */
  readFile(file: string): Promise<string | null>
  /** Restarts the whole server (systemd reboot) and waits for it to be up again. */
  reboot(): Promise<CheckOutcome | null>
}

export const q = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`

function makeVps(ctx: CheckContext, name: string): Vps {
  const exec = (args: string[], script: string, timeoutMs?: number) => ctx.docker(['exec', ...args, name, 'bash', '-c', script], { timeoutMs: timeoutMs ?? 60_000 })
  const vps: Vps = {
    name,
    sh: (script, opts = {}) =>
      opts.stdin === undefined
        ? exec([], script, opts.timeoutMs)
        : exec([], `printf '%s' ${Buffer.from(opts.stdin).toString('base64')} | base64 -d | {\n${script}\n}`, opts.timeoutMs),
    as: (user, script, opts = {}) => exec([], `cd / && runuser -l ${q(user)} -s /bin/bash -c ${q(script)}`, opts.timeoutMs),
    out: async (script) => (await exec([], script)).stdout.trim(),
    test: async (script) => (await exec([], script)).code === 0,
    async readFile(file) {
      const r = await exec([], `cat -- ${q(file)}`)
      return r.code === 0 ? r.stdout : null
    },
    async reboot() {
      const r = await ctx.docker(['restart', '-t', '20', name], { timeoutMs: 60_000 })
      if (r.code !== 0) return fail(`Le redémarrage du serveur a échoué : ${r.stderr.trim().split('\n')[0]}`)
      return waitBooted(ctx, name)
    },
  }
  return vps
}

// systemd's bus is not reachable during the first instants of a boot: retry until it answers.
const BOOT_WAIT = `for i in $(seq 60); do
  s=$(timeout 60 systemctl is-system-running --wait 2>/dev/null)
  case "$s" in running|degraded) break ;; esac
  sleep 1
done
echo "$s"`

async function waitBooted(ctx: CheckContext, name: string): Promise<CheckOutcome | null> {
  const r = await ctx.docker(['exec', name, 'bash', '-c', BOOT_WAIT], { timeoutMs: 70_000 })
  const state = r.stdout.trim()
  if (state === 'running' || state === 'degraded') return null
  return fail(`Le serveur ${name} ne finit pas de démarrer (état systemd : ${state || 'inconnu'}).`)
}

/** Wraps a criterion so that it only runs on a booted server. */
export function onVps(name: string, test: (vps: Vps, ctx: CheckContext) => Promise<CheckOutcome>) {
  return async (ctx: CheckContext): Promise<CheckOutcome> => {
    const info = await ctx.inspectContainer(name)
    if (!info) return fail(`Aucun serveur ${name} : il se démarre avec \`sh vps.sh\`.`)
    if (!info.State.Running) return fail(`Le serveur ${name} est arrêté.`)
    const notBooted = await waitBooted(ctx, name)
    return notBooted ?? test(makeVps(ctx, name), ctx)
  }
}

/** `stat` of a path: octal mode, owner and group names, type. Null if missing. */
export async function statOf(vps: Vps, file: string): Promise<{ mode: string; owner: string; group: string; type: string } | null> {
  const out = await vps.out(`stat -c '%a|%U|%G|%F' -- ${q(file)} 2>/dev/null`)
  if (!out) return null
  const [mode, owner, group, type] = out.split('|')
  return { mode, owner, group, type }
}

/** Formats an access test result as a short French observation. */
export const verdict = (user: string, action: string, allowed: boolean) => `${user} ${allowed ? 'peut' : 'ne peut pas'} ${action}`

/** Runs every check in order and stops at the first failure. */
export async function all(...checks: (() => Promise<CheckOutcome>)[]): Promise<CheckOutcome> {
  const observed: string[] = []
  for (const c of checks) {
    const r = await c()
    if (!r.ok) return r
    if (r.observed) observed.push(r.observed)
  }
  return pass(observed.join(' ') || undefined)
}

/**
 * Writes a fresh access log (combined format) on the server. The client IPs have distinct request
 * counts, and 5xx errors concentrate on one path that always carries varying parameters, so that
 * "top N" and "most hit" questions have a single answer.
 */
export async function writeAccessLog(vps: Vps, file: string, seed: number): Promise<void> {
  const r = await vps.sh(`mkdir -p "$(dirname ${q(file)})" && python3 - ${seed} ${q(file)} <<'PY'
import random, sys
random.seed(int(sys.argv[1]))
ips = list(dict.fromkeys(
    ["%d.%d.%d.%d" % (random.randint(11, 223), random.randint(0, 255), random.randint(0, 255), random.randint(1, 254)) for _ in range(30)]
    + ["2001:db8::%x" % random.randint(1, 4000) for _ in range(5)]))
counts = random.sample(range(5, 400), len(ips))
paths = ["/", "/contact", "/produits", "/img/logo.png", "/panier", "/api/stock", "/recherche"]
hot = random.choice(paths[1:])
lines = []
for ip, n in zip(ips, counts):
    for _ in range(n):
        status = random.choice([200, 200, 200, 200, 301, 304, 404, 500, 502, 503])
        path = random.choice(paths)
        if status >= 500 and random.random() < 0.5:
            path = hot + "?id=%d" % random.randint(1, 99)
        elif random.random() < 0.3:
            path += "?id=%d" % random.randint(1, 99)
        size = random.choice([random.randint(200, 9000), random.choice([500, 502, 503, 404])])
        lines.append('%s - - [12/Nov/2026:%02d:%02d:%02d +0100] "GET %s HTTP/1.1" %d %d "-" "Mozilla/5.0"'
                     % (ip, random.randint(0, 23), random.randint(0, 59), random.randint(0, 59), path, status, size))
random.shuffle(lines)
open(sys.argv[2], "w").write("\\n".join(lines) + "\\n")
PY
chmod 644 ${q(file)}`)
  if (r.code !== 0) throw new Error(`génération du journal de test impossible (${r.stderr.trim().split('\n').pop()})`)
}

/** Normalizes command output: trimmed lines, runs of blanks collapsed, empty lines dropped. */
export const lines = (out: string) => out.split('\n').map((l) => l.trim().split(/\s+/).join(' ')).filter(Boolean)

/** Shell snippets that succeed only when the running user holds the corresponding access. */
export const access = {
  read: (file: string) => `head -c1 -- ${q(file)} >/dev/null`,
  write: (file: string) => `test -e ${q(file)} && : >> ${q(file)}`,
  list: (dir: string) => `ls -- ${q(dir)} >/dev/null`,
  create: (dir: string) => `f=${q(dir)}/.dojo-sonde-$$ && touch "$f" && rm -f "$f"`,
  exec: (file: string) => `${q(file)} >/dev/null`,
}

/** True when `script` succeeds as `user`. */
export const can = async (vps: Vps, user: string, script: string) => (await vps.as(user, script)).code === 0

/** Users of the list that do not exist on the server. */
export async function missingUsers(vps: Vps, users: string[]): Promise<string[]> {
  const missing = []
  for (const u of users) if (!(await vps.test(`getent passwd ${q(u)} >/dev/null`))) missing.push(u)
  return missing
}

/**
 * Runs access expectations ([user, description, script, expected]) and reports the first mismatch
 * as an observation ("hugo peut lire /srv/x").
 */
export async function expectAccess(vps: Vps, rules: [string, string, string, boolean][]): Promise<CheckOutcome> {
  for (const [user, action, script, expected] of rules) {
    const allowed = await can(vps, user, script)
    if (allowed !== expected) return fail(`${verdict(user, action, allowed)}.`)
  }
  return pass()
}

// ---- SSH (module 5+) ----

const SSH_OPTS = ['-F', '/dev/null', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=no', '-o', 'UserKnownHostsFile=/dev/null', '-o', 'ConnectTimeout=5', '-o', 'LogLevel=ERROR']

/**
 * Logs in from the host to the lab server published on 127.0.0.1:`port` with a private key file.
 * The key is copied to a private temp dir first: ssh refuses keys readable by others.
 */
export async function sshLogin(ctx: CheckContext, opts: { port: number; user: string; key: string; command?: string }): Promise<ExecResult> {
  const dir = await ctx.tempDir()
  const key = `${dir}/cle`
  const copy = await ctx.exec('sh', ['-c', `cp "$1" "$2" && chmod 600 "$2"`, 'sh', opts.key, key])
  if (copy.code !== 0) return { code: 255, stdout: '', stderr: `clé illisible : ${opts.key}` }
  return ctx.exec('ssh', [...SSH_OPTS, '-o', 'IdentitiesOnly=yes', '-i', key, '-p', String(opts.port), `${opts.user}@127.0.0.1`, opts.command ?? 'true'], { timeoutMs: 20_000 })
}

/** Authentication methods the server offers to `user` ("publickey", "password"…), as listed when nothing is tried. */
export async function sshMethods(ctx: CheckContext, port: number, user: string): Promise<string[] | null> {
  const r = await ctx.exec('ssh', [...SSH_OPTS, '-o', 'PreferredAuthentications=none', '-p', String(port), `${user}@127.0.0.1`, 'true'], { timeoutMs: 20_000 })
  const m = (r.stdout + r.stderr).match(/Permission denied \(([^)]*)\)/)
  return m ? m[1].split(',') : null
}

/** Effective sshd setting (lowercase key) for a connection context, e.g. sshdSetting(vps, 'permitrootlogin', 'user=root'). */
export async function sshdSetting(vps: Vps, key: string, context = 'user=nobody,host=client,addr=192.0.2.1'): Promise<string> {
  return vps.out(`install -d -m 0755 /run/sshd && sshd -T -C ${q(context)} 2>/dev/null | awk '$1 == "${key}" { $1 = ""; sub(/^ /, ""); print }' | paste -sd' ' -`)
}

/** Path of a fixture file shipped next to a check.ts (never copied to the learner). */
export const fixture = (checkUrl: string, name: string) => new URL(`./fixtures/${name}`, checkUrl).pathname

// ---- cron (module 6+) ----

const CRON_RANGES: [number, number][] = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]]
const CRON_NAMES: Record<string, number>[] = [
  {}, {}, {},
  { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 },
  { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 },
]

/** Set of values matched by one cron field (minute, hour, day, month, weekday); null if unparsable. */
export function cronField(field: string, index: number): Set<number> | null {
  const [lo, hi] = CRON_RANGES[index]
  const value = (s: string) => (CRON_NAMES[index][s.toLowerCase()] ?? (/^\d+$/.test(s) ? Number(s) : NaN))
  const out = new Set<number>()
  for (const part of field.split(',')) {
    const m = part.match(/^(\*|([a-z0-9]+)(?:-([a-z0-9]+))?)(?:\/(\d+))?$/i)
    if (!m) return null
    const start = m[1] === '*' ? lo : value(m[2])
    const end = m[1] === '*' ? hi : m[3] !== undefined ? value(m[3]) : m[4] ? hi : start
    const step = m[4] ? Number(m[4]) : 1
    if ([start, end, step].some(Number.isNaN) || start < lo || end > hi || step < 1) return null
    for (let v = start; v <= end; v += step) out.add(index === 4 && v === 7 ? 0 : v)
  }
  return out
}

/** True when the five schedule fields match the same instants as `expected` ("*\/15 * * * *"). */
export function sameSchedule(fields: string[], expected: string): boolean {
  const want = expected.split(/\s+/)
  return want.every((w, i) => {
    const a = cronField(fields[i] ?? '', i)
    const b = cronField(w, i)
    return a !== null && b !== null && a.size === b.size && [...a].every((v) => b.has(v))
  })
}

export interface CronJob { schedule: string[]; user: string; command: string; env: Record<string, string> }

/** Jobs of a system crontab file (/etc/cron.d style, with a user field), as cron reads them. */
export function parseSystemCrontab(content: string): { jobs: CronJob[]; unterminated: boolean } {
  const env: Record<string, string> = {}
  const jobs: CronJob[] = []
  const unterminated = content.length > 0 && !content.endsWith('\n')
  const rows = content.split('\n')
  if (unterminated) rows.pop()
  for (const raw of rows) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const assign = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (assign) {
      env[assign[1]] = assign[2].replace(/^(["'])(.*)\1$/, '$2')
      continue
    }
    const parts = line.split(/\s+/)
    if (parts[0].startsWith('@')) jobs.push({ schedule: [parts[0]], user: parts[1], command: parts.slice(2).join(' '), env: { ...env } })
    else jobs.push({ schedule: parts.slice(0, 5), user: parts[5], command: line.replace(/^(\S+\s+){6}/, ''), env: { ...env } })
  }
  return { jobs, unterminated }
}

/**
 * Runs a cron job the way cron does: minimal environment, /bin/sh, home directory as working
 * directory, and `%` turned into newlines fed to the command's standard input.
 */
export async function runLikeCron(vps: Vps, job: { user: string; command: string; env?: Record<string, string> }): Promise<ExecResult> {
  let command = ''
  let stdin: string | null = null
  for (let i = 0; i < job.command.length; i++) {
    const c = job.command[i]
    if (c === '\\' && job.command[i + 1] === '%') { command += '%'; i++; continue }
    if (c === '%') { stdin = job.command.slice(i + 1).replace(/(?<!\\)%/g, '\n'); break }
    command += c
  }
  const home = (await vps.out(`getent passwd ${q(job.user)} | cut -d: -f6`)) || '/'
  const env: Record<string, string> = { HOME: home, LOGNAME: job.user, SHELL: '/bin/sh', PATH: '/usr/bin:/bin', ...(job.env ?? {}) }
  const envArgs = Object.entries(env).map(([k, v]) => q(`${k}=${v}`)).join(' ')
  const input = stdin === null ? '< /dev/null' : `<<'DOJO_STDIN'\n${stdin}\nDOJO_STDIN`
  return vps.sh(`cd ${q(home)} 2>/dev/null || cd /; setpriv --reuid=${q(job.user)} --regid=$(id -g ${q(job.user)}) --init-groups env -i ${envArgs} ${q(env.SHELL)} -c ${q(command)} ${input}`, { timeoutMs: 120_000 })
}
