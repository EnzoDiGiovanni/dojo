import { describe, expect, it } from 'vitest'
import type { Exercise, Module, Subject } from './content.ts'
import { currentPosition, moduleSummary, recordAnswer, suggestModule } from './engine.ts'
import type { SubjectState } from './state.ts'

const validation = (id: string): Exercise => ({
  id,
  type: 'validation',
  title: 'Validation',
  summary: '',
  competences: ['c'],
  hints: [],
  justifications: ['Pourquoi ?'],
  review: [],
  dir: '',
  consigne: '',
  checkFile: '',
  skeletonDir: null,
  trainerNotes: null,
})

const module = (number: number): Module => ({
  number,
  dir: '',
  title: `M${number}`,
  competences: [{ id: 'c', text: 'Je sais.' }],
  authored: true,
  cours: '# Cours',
  comprehension: [],
  quiz: [],
  exercises: [validation(`v${number}`)],
})

const subject: Subject = {
  id: 'demo',
  title: 'Démo',
  description: '',
  modules: [module(1), module(2), module(3)],
  diagnostic: [1, 2, 3].map((n) => ({
    id: `d${n}`,
    module: n,
    type: 'qcm' as const,
    prompt: '',
    justify: false,
    options: [{ text: 'ok', correct: true }, { text: 'ko', correct: false }],
  })),
}

const state = (suggestedModule: number): SubjectState => ({
  startedAt: '2026-01-01',
  profile: { objective: '', rhythm: '', selfLevel: '', diagnostic: {}, diagnosticScore: '', suggestedModule },
  modules: {},
  results: [],
  journal: [],
})

describe('suggestModule', () => {
  it('picks the first missed module, or the one after the last probe', () => {
    expect(suggestModule(subject, { d1: 0, d2: 1, d3: 0 }).module).toBe(2)
    expect(suggestModule(subject, { d1: 0, d2: 0, d3: 0 })).toEqual({ module: 3, score: '3/3' })
  })
})

describe('suggested start', () => {
  it('starts at the suggested module and offers a test-out of earlier ones only', () => {
    const s = state(2)
    expect(currentPosition(subject, s)?.module).toBe(2)
    const summaries = subject.modules.map((m) => moduleSummary(subject, s, m))
    expect(summaries.map((m) => [m.unlocked, m.canTestOut])).toEqual([
      [true, true],
      [true, false],
      [false, false],
    ])
  })

  it('brings an earlier module back into the path once the learner tests out of it', () => {
    const s = state(2)
    s.modules['1'] = { comprehension: {}, quiz: {}, exercises: {}, testOut: true }
    expect(currentPosition(subject, s)).toMatchObject({ module: 1, step: 'validation' })
  })
})

describe('recordAnswer', () => {
  it('keeps the first-try result and stops counting once solved', () => {
    let qs = recordAnswer(undefined, false)
    qs = recordAnswer(qs, true)
    qs = recordAnswer(qs, false)
    expect(qs).toEqual({ attempts: 2, firstTry: false, solved: true })
  })
})
