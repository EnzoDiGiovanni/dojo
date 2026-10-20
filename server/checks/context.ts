import { execFile } from 'node:child_process'
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { CheckContext, ExecOptions, ExecResult, HttpResponse, ProbeContainer } from './types.ts'

const DEFAULT_TIMEOUT = 60_000
const BUILD_TIMEOUT = 300_000

export function exec(cmd: string, args: string[], opts: ExecOptions = {}): Promise<ExecResult> {
  return new Promise((resolve) => {
    execFile(
      cmd,
      args,
      { cwd: opts.cwd, timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT, maxBuffer: 32 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const code = error ? (typeof error.code === 'number' ? error.code : 1) : 0
        resolve({ code, stdout: stdout.toString(), stderr: stderr.toString() })
      },
    )
  })
}

export function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (match) result[match[1]] = match[2].replace(/^(["'])(.*)\1$/, '$2')
  }
  return result
}

function insideDir(dir: string, relative: string): string {
  const resolved = path.resolve(dir, relative)
  if (resolved !== dir && !resolved.startsWith(dir + path.sep)) throw new Error(`Chemin hors de l'exercice : ${relative}`)
  return resolved
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function createCheckContext(dir: string): { ctx: CheckContext; cleanup: () => Promise<void> } {
  const containers: string[] = []
  const images: string[] = []
  const tempDirs: string[] = []
  const docker = (args: string[], opts?: ExecOptions) => exec('docker', args, opts)

  const inspect = async (type: 'container' | 'image', ref: string) => {
    const r = await docker(['inspect', '--type', type, ref])
    return r.code === 0 ? (JSON.parse(r.stdout)[0] ?? null) : null
  }

  const http = async (url: string, opts: { timeoutMs?: number } = {}): Promise<HttpResponse | null> => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(opts.timeoutMs ?? 3000) })
      return { status: res.status, body: await res.text() }
    } catch {
      return null
    }
  }

  const ctx: CheckContext = {
    dir,
    exec,
    docker,
    http,
    async waitForHttp(url, timeoutMs = 8000) {
      const deadline = Date.now() + timeoutMs
      while (Date.now() < deadline) {
        const res = await http(url, { timeoutMs: 1500 })
        if (res) return res
        await sleep(300)
      }
      return null
    },
    async readFile(relative) {
      try {
        return await readFile(insideDir(dir, relative), 'utf8')
      } catch {
        return null
      }
    },
    async readEnvFile(relative) {
      const content = await ctx.readFile(relative)
      return content === null ? null : parseEnvFile(content)
    },
    inspectContainer: (name) => inspect('container', name),
    inspectImage: (ref) => inspect('image', ref),
    async build(contextDir, { tag, buildArgs = {}, dockerfile }) {
      const fullTag = `dojo-check/${tag}`
      images.push(fullTag)
      const args = ['build', '--progress=plain', '-t', fullTag]
      if (dockerfile) args.push('-f', dockerfile)
      for (const [k, v] of Object.entries(buildArgs)) args.push('--build-arg', `${k}=${v}`)
      const r = await docker([...args, contextDir], { timeoutMs: BUILD_TIMEOUT })
      return { ok: r.code === 0, output: r.stdout + r.stderr }
    },
    async runProbe(image, { containerPort, args = [], env = {} } = {}) {
      const name = `dojo-probe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
      const runArgs = ['run', '-d', '--name', name, '--label', 'dojo.probe=1']
      if (containerPort) runArgs.push('-p', `127.0.0.1::${containerPort}`)
      for (const [k, v] of Object.entries(env)) runArgs.push('-e', `${k}=${v}`)
      const r = await docker([...runArgs, image, ...args])
      containers.push(name)
      if (r.code !== 0) {
        const reason = r.stderr.match(/(exec: [^\n]+)/)?.[1] ?? r.stderr.trim().split('\n')[0]
        throw new Error(`le conteneur de test n'a pas pu démarrer (${reason})`)
      }
      let hostPort: number | null = null
      if (containerPort) {
        const port = await docker(['port', name, `${containerPort}/tcp`])
        const match = port.stdout.match(/:(\d+)\s*$/m)
        hostPort = match ? Number(match[1]) : null
      }
      const probe: ProbeContainer = {
        name,
        hostPort,
        logs: async () => {
          const l = await docker(['logs', name])
          return l.stdout + l.stderr
        },
        async stop() {
          const start = Date.now()
          await docker(['stop', name], { timeoutMs: 30_000 })
          const durationMs = Date.now() - start
          const state = await inspect('container', name)
          return { durationMs, exitCode: state?.State?.ExitCode ?? -1 }
        },
        async remove() {
          await docker(['rm', '-f', name])
        },
      }
      return probe
    },
    runOnce(image, args = [], { entrypoint } = {}) {
      const runArgs = ['run', '--rm', '--label', 'dojo.probe=1']
      if (entrypoint !== undefined) runArgs.push('--entrypoint', entrypoint)
      return docker([...runArgs, image, ...args])
    },
    async tempCopy() {
      const target = await ctx.tempDir()
      await cp(dir, target, { recursive: true })
      return target
    },
    async tempDir() {
      const target = await mkdtemp(path.join(tmpdir(), 'dojo-check-'))
      tempDirs.push(target)
      return target
    },
  }

  const cleanup = async () => {
    if (containers.length) await docker(['rm', '-f', ...containers])
    if (images.length) await docker(['rmi', '-f', ...images])
    await Promise.all(tempDirs.map((d) => rm(d, { recursive: true, force: true })))
  }

  return { ctx, cleanup }
}
