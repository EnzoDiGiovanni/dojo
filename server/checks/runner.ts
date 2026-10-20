import { pathToFileURL } from 'node:url'
import type { CheckResult } from '../../shared/api.ts'
import { HttpError } from '../errors.ts'
import { createCheckContext, exec } from './context.ts'
import type { Criterion } from './types.ts'

export async function loadCriteria(checkFile: string): Promise<Criterion[]> {
  const mod = (await import(pathToFileURL(checkFile).href)) as { default: Criterion[] }
  return mod.default
}

export async function assertDockerAvailable(): Promise<void> {
  const r = await exec('docker', ['version', '--format', '{{.Server.Version}}'], { timeoutMs: 10_000 })
  if (r.code !== 0) throw new HttpError(503, 'Le daemon Docker ne répond pas : vérifie qu\'il tourne et que ton utilisateur peut lancer `docker ps`.')
}

// Criteria run sequentially: several of them start containers or builds.
export async function runChecks(checkFile: string, dir: string): Promise<CheckResult[]> {
  const criteria = await loadCriteria(checkFile)
  const { ctx, cleanup } = createCheckContext(dir)
  const results: CheckResult[] = []
  try {
    for (const c of criteria) {
      try {
        const outcome = await c.run(ctx)
        results.push({ id: c.id, label: c.label, ok: outcome.ok, ...(outcome.observed ? { observed: outcome.observed } : {}) })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        results.push({ id: c.id, label: c.label, ok: false, observed: `Vérification impossible : ${message}` })
      }
    }
  } finally {
    await cleanup()
  }
  return results
}
