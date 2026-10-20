// Pure pedagogical rules: gating, competence statuses, hint unlocking, position.
// No I/O here so every rule is unit-testable.
import {
  STEP_LABELS,
  STEPS,
  type AnswerResult,
  type CompetenceStatus,
  type ModuleSummary,
  type Position,
  type Step,
  type StepView,
} from '../shared/api.ts'
import { exerciseStep, type Exercise, type Module, type Question, type Subject } from './content.ts'
import { emptyExerciseState, moduleState, type ExerciseState, type ModuleState, type QuestionState, type SubjectState } from './state.ts'

export const MIN_TRIED_LENGTH = 20
export const MIN_JUSTIFICATION_LENGTH = 30
export const MIN_QUESTION_JUSTIFICATION_LENGTH = 15

export function questionDone(q: Question, qs: QuestionState | undefined): boolean {
  return !!qs?.solved && (!q.justify || !!qs.justification)
}

export function exerciseDone(e: Exercise, es: ExerciseState | undefined): boolean {
  if (!es?.passedAt) return false
  return e.type !== 'validation' || !!es.justifications
}

export function stepExercises(m: Module, step: Step): Exercise[] {
  return m.exercises.filter((e) => exerciseStep(e.type) === step)
}

export function stepDone(m: Module, ms: ModuleState, step: Step): boolean {
  switch (step) {
    case 'cours':
      return m.comprehension.every((q) => questionDone(q, ms.comprehension[q.id]))
    case 'quiz':
      return m.quiz.every((q) => questionDone(q, ms.quiz[q.id]))
    default:
      return stepExercises(m, step).every((e) => exerciseDone(e, ms.exercises[e.id]))
  }
}

export function stepViews(m: Module, ms: ModuleState): StepView[] {
  let previousDone = true
  return STEPS.map((step) => {
    const done = stepDone(m, ms, step)
    const unlocked = previousDone || (step === 'validation' && !!ms.testOut)
    previousDone &&= done
    return { step, done, unlocked }
  })
}

export function stepUnlocked(m: Module, ms: ModuleState, step: Step): boolean {
  return stepViews(m, ms).find((v) => v.step === step)!.unlocked
}

export function validationPassed(m: Module, ms: ModuleState): boolean {
  return stepDone(m, ms, 'validation') && stepExercises(m, 'validation').length > 0
}

export function moduleUnlocked(subject: Subject, s: SubjectState | undefined, number: number): boolean {
  const module = subject.modules.find((m) => m.number === number)
  if (!module?.authored || !s?.profile) return false
  if (number === 1 || number <= s.profile.suggestedModule) return true
  const previous = subject.modules.find((m) => m.number === number - 1)!
  return previous.authored && validationPassed(previous, moduleState(s, number - 1))
}

function moduleStarted(ms: ModuleState): boolean {
  return (
    Object.values(ms.comprehension).some((q) => q.attempts > 0) ||
    Object.values(ms.quiz).some((q) => q.attempts > 0) ||
    Object.values(ms.exercises).some((e) => !!e.startedAt)
  )
}

export function competenceStatus(m: Module, ms: ModuleState, competenceId: string): CompetenceStatus {
  const covering = m.exercises.filter((e) => e.competences.includes(competenceId))
  const validations = covering.filter((e) => e.type === 'validation').map((e) => ms.exercises[e.id])
  if (validations.some((v) => v?.passedAt && v.explanation?.verdict === 'ok')) return 'valide'
  if (validations.some((v) => v?.passedAt && v.justifications)) return 'a-defendre'
  const helped = covering.some((e) => {
    const es = ms.exercises[e.id]
    return !!es?.passedAt && es.hintsRevealed > 0
  })
  if (helped || validations.some((v) => v?.explanation?.verdict === 'ko')) return 'fragile'
  return moduleStarted(ms) ? 'en-cours' : 'a-venir'
}

export function moduleSummary(subject: Subject, s: SubjectState | undefined, m: Module): ModuleSummary {
  const ms = moduleState(s, m.number)
  const unlocked = moduleUnlocked(subject, s, m.number)
  return {
    number: m.number,
    title: m.title,
    authored: m.authored,
    unlocked,
    canTestOut: unlocked && m.number < (s?.profile?.suggestedModule ?? 1) && !ms.testOut && !validationPassed(m, ms),
    testOut: !!ms.testOut,
    competences: m.competences.map((c) => ({ ...c, status: m.authored ? competenceStatus(m, ms, c.id) : 'a-venir' })),
    steps: m.authored ? stepViews(m, ms) : [],
  }
}

export function currentPosition(subject: Subject, s: SubjectState | undefined): Position | null {
  if (!s?.profile) return null
  const base = `/s/${subject.id}`
  const unlocked = subject.modules.filter((m) => moduleUnlocked(subject, s, m.number))
  // Modules before the suggested start are optional unless the learner engaged with them.
  const relevant = unlocked.filter((m) => {
    const ms = moduleState(s, m.number)
    return m.number >= s.profile!.suggestedModule || ms.testOut || moduleStarted(ms)
  })
  const module = relevant.find((m) => !validationPassed(m, moduleState(s, m.number))) ?? unlocked.at(-1)
  if (!module) return null
  const ms = moduleState(s, module.number)
  const step = stepViews(module, ms).find((v) => v.unlocked && !v.done)?.step
  if (!step) {
    return { module: module.number, step: 'validation', label: `Module ${module.number} terminé`, href: `${base}/m/${module.number}` }
  }
  const pending = stepExercises(module, step).find((e) => !exerciseDone(e, ms.exercises[e.id]))
  if (pending) {
    return {
      module: module.number,
      step,
      label: `${STEP_LABELS[step]} — ${pending.title}`,
      href: `${base}/m/${module.number}/e/${pending.id}`,
    }
  }
  return {
    module: module.number,
    step,
    label: `${STEP_LABELS[step]} — module ${module.number}`,
    href: `${base}/m/${module.number}?step=${step}`,
  }
}

export function evaluateAnswer(q: Question, option: number): AnswerResult {
  const chosen = q.options[option]
  if (!chosen) return { correct: false, relance: 'Choisis une des options proposées.' }
  return chosen.correct ? { correct: true } : { correct: false, ...(chosen.relance ? { relance: chosen.relance } : {}) }
}

export function recordAnswer(qs: QuestionState | undefined, correct: boolean): QuestionState {
  const next: QuestionState = qs ? { ...qs } : { attempts: 0, firstTry: null, solved: false }
  if (next.solved) return next
  next.attempts += 1
  if (next.attempts === 1) next.firstTry = correct
  if (correct) next.solved = true
  return next
}

export function hintLock(e: Exercise, es: ExerciseState = emptyExerciseState()): string | null {
  if (e.type === 'validation') return 'La validation se fait sans aide.'
  if (es.passedAt) return 'Exercice réussi.'
  if (es.hintsRevealed >= e.hints.length) return 'Tous les indices sont dévoilés.'
  if (!es.startedAt) return "Commence l'exercice d'abord."
  if (es.hintsRevealed === 0 && es.checkRuns === 0) return 'Lance au moins une vérification avant de demander un indice.'
  if (es.hintsRevealed > 0 && es.checksSinceHint === 0) return 'Tente quelque chose et relance une vérification avant le prochain indice.'
  return null
}

export function scoreLine(questions: Question[], states: Record<string, QuestionState>): string {
  const first = questions.filter((q) => states[q.id]?.firstTry).length
  return `${first}/${questions.length} au premier essai`
}

export function suggestModule(subject: Subject, answers: Record<string, number>): { module: number; score: string } {
  const sorted = [...subject.diagnostic].sort((a, b) => a.module - b.module)
  const correct = (q: (typeof sorted)[number]) => !!q.options[answers[q.id] ?? -1]?.correct
  const firstMiss = sorted.find((q) => !correct(q))
  const lastAuthored = Math.max(1, ...subject.modules.filter((m) => m.authored).map((m) => m.number))
  const candidate = firstMiss ? firstMiss.module : Math.max(1, ...sorted.map((q) => q.module + 1))
  return {
    module: Math.min(candidate, lastAuthored),
    score: `${sorted.filter(correct).length}/${sorted.length}`,
  }
}

export interface WarmupCandidate {
  module: number
  question: Question
}

// Prefers questions from earlier modules that were missed on first try.
export function warmupCandidates(subject: Subject, s: SubjectState, current: number): WarmupCandidate[] {
  const pool: (WarmupCandidate & { missed: boolean })[] = []
  for (const m of subject.modules.filter((m) => m.authored && m.number < current)) {
    const ms = moduleState(s, m.number)
    for (const q of m.quiz) {
      const qs = ms.quiz[q.id]
      if (qs?.solved) pool.push({ module: m.number, question: q, missed: qs.firstTry === false })
    }
  }
  const missed = pool.filter((c) => c.missed)
  return (missed.length > 0 ? missed : pool).map(({ module, question }) => ({ module, question }))
}

export function fragilePoints(subject: Subject, s: SubjectState): string[] {
  const points: string[] = []
  for (const m of subject.modules.filter((m) => m.authored)) {
    const ms = moduleState(s, m.number)
    for (const c of m.competences) {
      const status = competenceStatus(m, ms, c.id)
      if (status === 'fragile') points.push(`M${m.number} — ${c.text} (fragile)`)
      if (status === 'a-defendre') points.push(`M${m.number} — ${c.text} (explication à défendre)`)
    }
  }
  return points
}
