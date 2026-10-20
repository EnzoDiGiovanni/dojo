// Shared building blocks for Docker check.ts files.
import type { CheckContext, CheckOutcome } from '#check'
import { appendFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { buildSteps } from '../../server/checks/buildkit.ts'

export { formatBytes } from '../../server/checks/buildkit.ts'

export const pass = (observed?: string): CheckOutcome => ({ ok: true, ...(observed ? { observed } : {}) })
export const fail = (observed: string): CheckOutcome => ({ ok: false, observed })

export async function containerRunning(ctx: CheckContext, name: string, image?: string): Promise<CheckOutcome> {
  const info = await ctx.inspectContainer(name)
  if (!info) return fail(`Aucun conteneur nommé ${name}.`)
  if (image && info.Config.Image !== image) return fail(`Image du conteneur : ${info.Config.Image}.`)
  if (!info.State.Running) return fail(`État du conteneur : ${info.State.Status} (code de sortie ${info.State.ExitCode}).`)
  return pass()
}

export async function httpAnswers(
  ctx: CheckContext,
  url: string,
  expect: { contains?: string; exact?: string; status?: number } = {},
): Promise<CheckOutcome> {
  const res = await ctx.http(url)
  if (!res) return fail(`Aucune réponse sur ${url}.`)
  const status = expect.status ?? 200
  if (res.status !== status) return fail(`Code HTTP reçu : ${res.status}.`)
  if (expect.exact !== undefined && res.body.trim() !== expect.exact) return fail(`Réponse reçue : « ${res.body.trim().slice(0, 80)} ».`)
  if (expect.contains && !res.body.includes(expect.contains)) return fail(`Une page répond, mais elle ne contient pas « ${expect.contains} ».`)
  return pass()
}

export function containerIp(info: any): string | null {
  const networks = Object.values(info?.NetworkSettings?.Networks ?? {}) as { IPAddress?: string }[]
  return networks.map((n) => n.IPAddress).find((ip) => !!ip) ?? null
}

export async function fileMatches(ctx: CheckContext, file: string, expected: string | null, what: string): Promise<CheckOutcome> {
  if (expected === null) return fail(`Impossible d'obtenir ${what} depuis Docker (conteneur absent ou arrêté).`)
  const content = await ctx.readFile(file)
  if (content === null) return fail(`Fichier ${file} absent.`)
  if (content.trim() === '') return fail(`Fichier ${file} vide.`)
  return content.trim() === expected.trim() ? pass() : fail(`Le contenu de ${file} ne correspond pas à ${what}.`)
}

/** Lists containers matching `docker ps -a` filters. */
export async function containerNames(ctx: CheckContext, filters: string[]): Promise<string[]> {
  const args = ['ps', '-a', '--format', '{{.Names}}', ...filters.flatMap((f) => ['--filter', f])]
  const r = await ctx.docker(args)
  return r.stdout.split('\n').filter((n) => n && !n.startsWith('dojo-probe-'))
}

export async function hostBinding(ctx: CheckContext, name: string, containerPort: number): Promise<{ hostIp: string; hostPort: string } | null> {
  const info = await ctx.inspectContainer(name)
  const binding = info?.HostConfig?.PortBindings?.[`${containerPort}/tcp`]?.[0]
  return binding ? { hostIp: binding.HostIp || '0.0.0.0', hostPort: binding.HostPort } : null
}

// ---- Image builds (module 2+) ----

export interface Built {
  ok: boolean
  image: string
  failure: CheckOutcome | null
  output: string
}

/** Builds the learner's folder (or another context) under a throw-away dojo-check/ tag. */
export async function buildImage(ctx: CheckContext, tag: string, opts: { contextDir?: string; buildArgs?: Record<string, string> } = {}): Promise<Built> {
  if (!(await ctx.readFile('Dockerfile'))) {
    return { ok: false, image: '', output: '', failure: fail('Aucun Dockerfile dans le dossier de l\'exercice.') }
  }
  const result = await ctx.build(opts.contextDir ?? ctx.dir, { tag, buildArgs: opts.buildArgs })
  const image = `dojo-check/${tag}`
  if (result.ok) return { ok: true, image, output: result.output, failure: null }
  const errorLine = result.output.split('\n').find((l) => /^ERROR|error:/i.test(l.trim())) ?? 'voir `docker build` dans ton terminal'
  return { ok: false, image, output: result.output, failure: fail(`Le build échoue : ${errorLine.trim().slice(0, 200)}`) }
}

/** Starts the image, waits for HTTP on `containerPort` and returns the response of `path`. */
export async function probeHttp(
  ctx: CheckContext,
  image: string,
  opts: { containerPort: number; path?: string; args?: string[]; env?: Record<string, string> },
) {
  const probe = await ctx.runProbe(image, { containerPort: opts.containerPort, args: opts.args, env: opts.env })
  const res = probe.hostPort ? await ctx.waitForHttp(`http://127.0.0.1:${probe.hostPort}${opts.path ?? '/'}`, 10_000) : null
  return { probe, res }
}

export async function probeAnswers(
  ctx: CheckContext,
  image: string,
  opts: { containerPort: number; path?: string; args?: string[]; contains?: string; exact?: string },
): Promise<CheckOutcome> {
  const { probe, res } = await probeHttp(ctx, image, opts)
  const target = `le port ${opts.containerPort} du conteneur${opts.path ? ` (${opts.path})` : ''}`
  if (!res) {
    const state = await ctx.inspectContainer(probe.name)
    return state?.State?.Running
      ? fail(`Le conteneur tourne, mais rien ne répond sur ${target}.`)
      : fail(`Le conteneur s'est arrêté (code de sortie ${state?.State?.ExitCode ?? '?'}).`)
  }
  const received = fail(`Réponse reçue sur ${target} : ${res.body.trim() ? `« ${res.body.trim().slice(0, 80)} »` : '(vide)'}.`)
  if (opts.exact !== undefined && res.body.trim() !== opts.exact) return received
  if (opts.contains && !res.body.includes(opts.contains)) return received
  return pass()
}

/**
 * Builds a copy of the folder, edits `file` in the copy, rebuilds, and checks that the
 * step matching `step` was served from cache.
 */
export async function cacheSurvivesEdit(ctx: CheckContext, opts: { tag: string; file: string; comment: string; step: RegExp; stepName: string }): Promise<CheckOutcome> {
  const copy = await ctx.tempCopy()
  const first = await buildImage(ctx, `${opts.tag}-cache`, { contextDir: copy })
  if (!first.ok) return first.failure!
  await appendFile(path.join(copy, opts.file), `\n${opts.comment} dojo cache probe ${Date.now()}\n`)
  const second = await buildImage(ctx, `${opts.tag}-cache`, { contextDir: copy })
  if (!second.ok) return second.failure!
  const step = buildSteps(second.output).find((s) => opts.step.test(s.instruction))
  if (!step) return fail(`Aucune étape d'installation (${opts.stepName}) trouvée dans le build.`)
  return step.cached ? pass() : fail(`Après une modification de ${opts.file}, l'étape « ${step.instruction} » a été rejouée.`)
}

/** Searches the whole image filesystem for files with the given names. */
export async function findInImage(ctx: CheckContext, image: string, names: string[]): Promise<string[]> {
  const expr = names.map((n) => `-name '${n}'`).join(' -o ')
  const r = await ctx.runOnce(image, ['-c', `find / -xdev \\( ${expr} \\) -not -path '*/node_modules/*' -not -path '/usr/lib/*' -not -path '/usr/local/lib/*' 2>/dev/null`], { entrypoint: 'sh' })
  return r.stdout.split('\n').filter(Boolean)
}

export async function stopsCleanly(ctx: CheckContext, image: string, opts: { containerPort: number; args?: string[] }): Promise<CheckOutcome> {
  const { probe } = await probeHttp(ctx, image, opts)
  const state = await ctx.inspectContainer(probe.name)
  if (!state?.State?.Running) return fail(`Le conteneur s'est arrêté tout seul (code de sortie ${state?.State?.ExitCode ?? '?'}).`)
  const { durationMs, exitCode } = await probe.stop()
  const measured = `docker stop a pris ${(durationMs / 1000).toFixed(1)} s, code de sortie ${exitCode}.`
  return durationMs < 3000 && exitCode === 0 ? pass(measured) : fail(measured)
}

/**
 * Total size in bytes of the files the builder receives from the learner's folder, after
 * .dockerignore filtering. Measured by copying the context into a probe image, because
 * BuildKit's "transferring context" line only reports what changed since the last build.
 */
export async function contextBytes(ctx: CheckContext): Promise<number | CheckOutcome> {
  const tmp = await ctx.tempDir()
  const dockerfile = path.join(tmp, 'Dockerfile')
  await writeFile(dockerfile, 'FROM busybox:1.37\nCOPY . /ctx\n')
  const built = await ctx.build(ctx.dir, { tag: 'context-probe', dockerfile })
  if (!built.ok) return fail('Impossible de mesurer le contexte de build.')
  const r = await ctx.runOnce('dojo-check/context-probe', ['sh', '-c', 'find /ctx -type f -exec cat {} + | wc -c'])
  return Number(r.stdout.trim())
}
