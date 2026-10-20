import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { CheckResult } from '../shared/api.ts'
import { dataFile } from './paths.ts'

export interface QuestionState {
  attempts: number
  firstTry: boolean | null
  solved: boolean
  justification?: string
}

export interface ExerciseState {
  startedAt?: string
  passedAt?: string
  checkRuns: number
  lastCheck?: { at: string; results: CheckResult[] }
  hintsRevealed: number
  checksSinceHint: number
  tried: { at: string; hintLevel: number; text: string }[]
  justifications?: string[]
  explanation?: { verdict: 'ok' | 'ko'; at: string; note?: string }
}

export interface ModuleState {
  comprehension: Record<string, QuestionState>
  quiz: Record<string, QuestionState>
  exercises: Record<string, ExerciseState>
  testOut?: boolean
}

export interface Profile {
  objective: string
  rhythm: string
  selfLevel: string
  diagnostic: Record<string, number>
  diagnosticScore: string
  suggestedModule: number
}

export interface SubjectState {
  startedAt: string
  lastSessionAt?: string
  profile?: Profile
  session?: {
    startedAt: string
    warmup?: { module: number; questionId: string; attempts: number; solved: boolean }
  }
  modules: Record<string, ModuleState>
  results: { date: string; module: number; activity: string; result: string }[]
  journal: { date: string; text: string; source: 'site' | 'coach' }[]
}

export interface State {
  version: 1
  subjects: Record<string, SubjectState>
}

const emptyState = (): State => ({ version: 1, subjects: {} })

export async function readState(): Promise<State> {
  const file = dataFile()
  if (!existsSync(file)) return emptyState()
  return JSON.parse(await readFile(file, 'utf8')) as State
}

async function writeState(state: State): Promise<void> {
  const file = dataFile()
  await mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  await writeFile(tmp, JSON.stringify(state, null, 2))
  await rename(tmp, file)
}

let queue: Promise<unknown> = Promise.resolve()

// Serializes read-modify-write cycles so concurrent requests never lose an update.
export function mutate<T>(fn: (state: State) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const state = await readState()
    const result = await fn(state)
    await writeState(state)
    return result
  })
  queue = run.catch(() => undefined)
  return run
}

export function subjectState(state: State, subject: string): SubjectState {
  state.subjects[subject] ??= { startedAt: new Date().toISOString(), modules: {}, results: [], journal: [] }
  return state.subjects[subject]
}

export function emptyModuleState(): ModuleState {
  return { comprehension: {}, quiz: {}, exercises: {} }
}

export function moduleState(s: SubjectState | undefined, number: number): ModuleState {
  return s?.modules[String(number)] ?? emptyModuleState()
}

export function ensureModuleState(s: SubjectState, number: number): ModuleState {
  s.modules[String(number)] ??= emptyModuleState()
  return s.modules[String(number)]
}

export function emptyExerciseState(): ExerciseState {
  return { checkRuns: 0, hintsRevealed: 0, checksSinceHint: 0, tried: [] }
}

export function ensureExerciseState(ms: ModuleState, id: string): ExerciseState {
  ms.exercises[id] ??= emptyExerciseState()
  return ms.exercises[id]
}
