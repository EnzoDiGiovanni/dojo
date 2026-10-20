// DTOs exchanged between the server and the web client.
// Questions never carry which option is correct: only the server knows.

export const STEPS = ['cours', 'application', 'quiz', 'intermediaire', 'defi', 'validation'] as const
export type Step = (typeof STEPS)[number]

export const STEP_LABELS: Record<Step, string> = {
  cours: 'Cours',
  application: 'Application',
  quiz: 'Quiz',
  intermediaire: 'Intermédiaire',
  defi: 'Défi',
  validation: 'Validation',
}

export type ExerciseType = 'application' | 'intermediaire' | 'defi' | 'validation'

export type CompetenceStatus = 'valide' | 'a-defendre' | 'fragile' | 'en-cours' | 'a-venir'

export type HintLevel = 'comprehension' | 'demarche' | 'zone' | 'concept'

export type QuestionKind = 'comprehension' | 'quiz'

export interface PublicQuestion {
  id: string
  type: 'qcm' | 'vrai-faux' | 'prediction'
  prompt: string
  code?: string
  justify: boolean
  options: string[]
}

export interface QuestionProgress {
  attempts: number
  solved: boolean
  justification?: string
}

export interface AnswerResult {
  correct: boolean
  relance?: string
}

export interface SubjectSummary {
  id: string
  title: string
  description: string
  started: boolean
}

export interface CompetenceView {
  id: string
  text: string
  status: CompetenceStatus
}

export interface StepView {
  step: Step
  done: boolean
  unlocked: boolean
}

export interface ModuleSummary {
  number: number
  title: string
  authored: boolean
  unlocked: boolean
  canTestOut: boolean
  testOut: boolean
  competences: CompetenceView[]
  steps: StepView[]
}

export interface Position {
  module: number
  step: Step
  label: string
  href: string
}

export interface SubjectOverview {
  id: string
  title: string
  description: string
  profile: { objective: string; rhythm: string; selfLevel: string; suggestedModule: number } | null
  session: { startedAt: string } | null
  lastSessionAt: string | null
  modules: ModuleSummary[]
  position: Position | null
  progressionFile: string
}

export interface DiagnosticPayload {
  objective: string
  rhythm: string
  selfLevel: string
  answers: Record<string, number>
}

export interface ExerciseListItem {
  id: string
  type: ExerciseType
  title: string
  summary: string
  started: boolean
  passed: boolean
  hintsUsed: number
}

export interface ModuleView extends ModuleSummary {
  cours: string | null
  comprehension: { question: PublicQuestion; progress: QuestionProgress }[]
  quiz: { question: PublicQuestion; progress: QuestionProgress }[]
  exercises: ExerciseListItem[]
}

export interface CheckResult {
  id: string
  label: string
  ok: boolean
  observed?: string
}

export interface ExerciseView {
  module: number
  moduleTitle: string
  id: string
  type: ExerciseType
  title: string
  summary: string
  consigne: string
  workdir: string
  started: boolean
  passed: boolean
  checkRuns: number
  lastCheck: { at: string; results: CheckResult[] } | null
  hints: {
    revealed: { level: HintLevel; text: string }[]
    total: number
    canUnlock: boolean
    lockedReason: string | null
  }
  relay: string | null
  /** Post-success review questions, only sent once the exercise is passed. */
  review: string[] | null
  justification: {
    questions: string[]
    answers: string[] | null
    explanation: { verdict: 'ok' | 'ko'; note?: string } | null
  } | null
}

export interface StartResult {
  workdir: string
  created: string[]
  skipped: string[]
}

export interface CheckResponse {
  results: CheckResult[]
  passed: boolean
  newlyPassed: boolean
}

export interface SessionStart {
  rappel: { lastJournal: string | null; fragile: string[]; position: Position | null }
  warmup: { module: number; question: PublicQuestion } | null
}

export interface SessionEnd {
  reussi: string
  fragile: string
  prochaineFois: string
}
