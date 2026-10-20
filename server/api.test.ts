import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./checks/runner.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./checks/runner.ts')>()),
  assertDockerAvailable: async () => undefined,
}))

const { api } = await import('./api.ts')

let tmp: string

beforeEach(async () => {
  tmp = await mkdtemp(path.join(tmpdir(), 'dojo-test-'))
  process.env.DOJO_CONTENT_DIR = path.join(import.meta.dirname, '__fixtures__/content')
  process.env.DOJO_DATA_DIR = path.join(tmp, 'data')
  process.env.DOJO_FORMATION_DIR = path.join(tmp, 'formation')
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

async function call<T = any>(method: 'GET' | 'POST', url: string, body?: unknown): Promise<{ status: number; data: T }> {
  const res = await api.request(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { status: res.status, data: (await res.json()) as T }
}

const diagnose = (answers = { d1: 0, d2: 1 }) =>
  call('POST', '/subjects/demo/diagnostic', { objective: 'Apprendre la démo', rhythm: '30 min', selfLevel: 'Débutant', answers })

const answer = (kind: string, qid: string, option: number, justification?: string) =>
  call('POST', `/subjects/demo/modules/1/questions/${kind}/${qid}`, { option, justification })

const exercise = (id: string, action = '', body?: unknown) =>
  call(action ? 'POST' : 'GET', `/subjects/demo/modules/1/exercises/${id}${action ? `/${action}` : ''}`, body)

async function finishCoursAndApplication() {
  await answer('comprehension', 'cq', 0)
  await exercise('a1', 'start')
  await writeFile(path.join(tmp, 'formation/demo/module-1/exercice-a1/ok.txt'), 'ok')
  await exercise('a1', 'check')
}

describe('questions never leak the correct option', () => {
  it('serves questions without correctness flags and only answers with a follow-up', async () => {
    await diagnose()
    const { data: module } = await call('GET', '/subjects/demo/modules/1')
    expect(JSON.stringify(module)).not.toMatch(/"correct"|relance/)
    const { data: diag } = await call('GET', '/subjects/demo/diagnostic')
    expect(JSON.stringify(diag)).not.toMatch(/"correct"/)

    const wrong = await answer('comprehension', 'cq', 1)
    expect(wrong.data).toEqual({ correct: false, relance: 'Vraiment ?' })
    const right = await answer('comprehension', 'cq', 0)
    expect(right.data).toEqual({ correct: true })
  })
})

describe('diagnostic', () => {
  it('suggests the first module whose probe was missed', async () => {
    expect((await diagnose({ d1: 1, d2: 0 })).data).toEqual({ suggestedModule: 1 })
  })

  it('never suggests a module that is not written yet', async () => {
    expect((await diagnose({ d1: 0, d2: 0 })).data).toEqual({ suggestedModule: 1 })
  })

  it('cannot be taken twice', async () => {
    await diagnose()
    expect((await diagnose()).status).toBe(409)
  })
})

describe('module cycle', () => {
  it('unlocks steps in order', async () => {
    await diagnose()
    expect((await exercise('a1')).status).toBe(403)
    expect((await answer('quiz', 'q1', 1)).status).toBe(403)
    await answer('comprehension', 'cq', 0)
    expect((await exercise('a1')).status).toBe(200)
    expect((await exercise('v1')).status).toBe(403)
  })

  it('records the first-try score and requires a justification when asked', async () => {
    await diagnose()
    await finishCoursAndApplication()
    await answer('quiz', 'q1', 0)
    await answer('quiz', 'q1', 1)
    expect((await answer('quiz', 'q2', 0)).status).toBe(400)
    expect((await answer('quiz', 'q2', 0, 'Parce que la démo le dit.')).data).toEqual({ correct: true })
    const { data: overview } = await call('GET', '/subjects/demo')
    expect(overview.modules[0].steps.find((s: any) => s.step === 'quiz').done).toBe(true)
    const progression = await readFile(path.join(tmp, 'formation/demo/progression.md'), 'utf8')
    expect(progression).toContain('| 1 | Quiz | 1/2 au premier essai |')
  })
})

describe('exercises', () => {
  it('scaffolds the workspace without overwriting the learner files', async () => {
    await diagnose()
    await answer('comprehension', 'cq', 0)
    const first = await exercise('a1', 'start')
    expect(first.data.created.sort()).toEqual(['CONSIGNE.md', 'start.txt'])
    const file = path.join(tmp, 'formation/demo/module-1/exercice-a1/start.txt')
    await writeFile(file, 'mon travail')
    const second = await exercise('a1', 'start')
    expect(second.data.skipped.sort()).toEqual(['CONSIGNE.md', 'start.txt'])
    expect(await readFile(file, 'utf8')).toBe('mon travail')
  })

  it('gates hints behind an attempt and a description of what was tried', async () => {
    await diagnose()
    await answer('comprehension', 'cq', 0)
    await exercise('a1', 'start')
    expect((await exercise('a1')).data.hints.canUnlock).toBe(false)
    const check = await exercise('a1', 'check')
    expect(check.data.results).toEqual([{ id: 'file', label: 'Le fichier ok.txt existe', ok: false, observed: 'absent' }])
    expect((await exercise('a1', 'hint', { tried: 'court' })).status).toBe(400)
    expect((await exercise('a1', 'hint', { tried: "J'ai cherché le fichier sans le trouver." })).status).toBe(200)
    const view = (await exercise('a1')).data
    expect(view.hints.revealed).toEqual([{ level: 'comprehension', text: 'Indice 1 ?' }])
    expect(view.hints.canUnlock).toBe(false)
    expect((await exercise('a1', 'hint', { tried: "J'ai encore cherché sans rien changer." })).status).toBe(409)
  })

  it('marks a competence fragile when the exercise was passed with hints', async () => {
    await diagnose()
    await answer('comprehension', 'cq', 0)
    await exercise('a1', 'start')
    await exercise('a1', 'check')
    await exercise('a1', 'hint', { tried: "J'ai cherché le fichier sans le trouver." })
    await writeFile(path.join(tmp, 'formation/demo/module-1/exercice-a1/ok.txt'), 'ok')
    expect((await exercise('a1', 'check')).data.newlyPassed).toBe(true)
    const { data: overview } = await call('GET', '/subjects/demo')
    expect(overview.modules[0].competences.find((c: any) => c.id === 'c1').status).toBe('fragile')
    expect(await readFile(path.join(tmp, 'formation/demo/progression.md'), 'utf8')).toContain("a essayé : « J'ai cherché le fichier sans le trouver. »")
  })
})

describe('validation', () => {
  it('requires justifications, then a coach verdict, before validating', async () => {
    const { recordExplanation } = await import('./service.ts')
    await diagnose()
    await finishCoursAndApplication()
    await answer('quiz', 'q1', 1)
    await answer('quiz', 'q2', 0, 'Parce que la démo le dit.')
    expect((await exercise('v1')).data.hints.total).toBe(0)
    await exercise('v1', 'start')
    await writeFile(path.join(tmp, 'formation/demo/module-1/exercice-v1/ok.txt'), 'ok')
    await exercise('v1', 'check')
    expect((await exercise('v1', 'justify', { answers: ['trop court', 'aussi'] })).status).toBe(400)
    const long = 'Une justification suffisamment longue pour passer.'
    await exercise('v1', 'justify', { answers: [long, long] })

    let overview = (await call('GET', '/subjects/demo')).data
    expect(overview.modules[0].competences.map((c: any) => c.status)).toEqual(['a-defendre', 'a-defendre'])
    expect(overview.modules[1].unlocked).toBe(false)
    expect(await readFile(path.join(tmp, 'formation/demo/progression.md'), 'utf8')).toContain('## Explications à défendre')

    await recordExplanation('demo', 1, 'ok', 'Bien argumenté')
    overview = (await call('GET', '/subjects/demo')).data
    expect(overview.modules[0].competences.map((c: any) => c.status)).toEqual(['valide', 'valide'])
  })

  it('sends the learner back to the validation when the coach rejects the explanation', async () => {
    const { recordExplanation } = await import('./service.ts')
    await diagnose()
    await answer('comprehension', 'cq', 0)
    await call('POST', '/subjects/demo/modules/1/test-out')
    await exercise('v1', 'start')
    await writeFile(path.join(tmp, 'formation/demo/module-1/exercice-v1/ok.txt'), 'ok')
    await exercise('v1', 'check')
    const long = 'Une justification suffisamment longue pour passer.'
    await exercise('v1', 'justify', { answers: [long, long] })
    await recordExplanation('demo', 1, 'ko', 'Confusion entre A et B')
    const view = (await exercise('v1')).data
    expect(view.passed).toBe(false)
    expect(view.justification.explanation).toEqual({ verdict: 'ko', note: 'Confusion entre A et B' })
    const { data: overview } = await call('GET', '/subjects/demo')
    expect(overview.modules[0].competences[0].status).toBe('fragile')
  })
})

describe('sessions', () => {
  it('writes a journal entry with the session summary', async () => {
    await diagnose()
    const start = await call('POST', '/subjects/demo/session/start')
    expect(start.data.warmup).toBeNull()
    await answer('comprehension', 'cq', 0)
    const end = await call('POST', '/subjects/demo/session/end', { note: 'Bonne séance' })
    expect(end.data.reussi).toContain('Questions de compréhension')
    const progression = await readFile(path.join(tmp, 'formation/demo/progression.md'), 'utf8')
    expect(progression).toMatch(/## Journal des séances\n\n- \*\*\d{4}-\d{2}-\d{2}\*\* — Réussi : Questions de compréhension/)
    expect(progression).toContain('Ressenti : Bonne séance')
  })
})

it('keeps trainer notes out of the API but in progression.md once the exercise is started', async () => {
  await diagnose()
  await answer('comprehension', 'cq', 0)
  expect(JSON.stringify((await exercise('a1')).data)).not.toContain('Formateur')
  await exercise('a1', 'start')
  expect(existsSync(path.join(tmp, 'formation/demo/module-1/exercice-a1/TRAINER.md'))).toBe(false)
  expect(await readFile(path.join(tmp, 'formation/demo/progression.md'), 'utf8')).toContain('Formateur : rien.')
})
