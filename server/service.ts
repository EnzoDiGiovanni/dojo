import { existsSync } from 'node:fs'
import { copyFile, mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import type {
  AnswerResult,
  CheckResponse,
  DiagnosticPayload,
  ExerciseView,
  ModuleView,
  PublicQuestion,
  QuestionKind,
  SessionEnd,
  SessionStart,
  StartResult,
  SubjectOverview,
  SubjectSummary,
} from '../shared/api.ts'
import { exerciseStep, findExercise, findModule, listSubjectIds, loadSubject, toPublicQuestion, type Subject } from './content.ts'
import {
  MIN_JUSTIFICATION_LENGTH,
  MIN_QUESTION_JUSTIFICATION_LENGTH,
  MIN_TRIED_LENGTH,
  competenceStatus,
  currentPosition,
  evaluateAnswer,
  exerciseDone,
  fragilePoints,
  hintLock,
  moduleSummary,
  moduleUnlocked,
  recordAnswer,
  scoreLine,
  stepDone,
  stepUnlocked,
  suggestModule,
  validationPassed,
  warmupCandidates,
} from './engine.ts'
import { HttpError } from './errors.ts'
import { assertDockerAvailable, runChecks } from './checks/runner.ts'
import { exerciseWorkdir, progressionFile } from './paths.ts'
import { writeProgression } from './progression.ts'
import {
  emptyExerciseState,
  ensureExerciseState,
  ensureModuleState,
  moduleState,
  mutate,
  readState,
  subjectState,
  type SubjectState,
} from './state.ts'

const now = () => new Date().toISOString()

async function change<T>(subjectId: string, fn: (subject: Subject, s: SubjectState) => T | Promise<T>): Promise<T> {
  const subject = await loadSubject(subjectId)
  const result = await mutate((state) => fn(subject, subjectState(state, subjectId)))
  await writeProgression(subject)
  return result
}

async function snapshot(subjectId: string): Promise<{ subject: Subject; s: SubjectState | undefined }> {
  const [subject, state] = await Promise.all([loadSubject(subjectId), readState()])
  return { subject, s: state.subjects[subjectId] }
}

function requireProfile(s: SubjectState | undefined): asserts s is SubjectState {
  if (!s?.profile) throw new HttpError(409, 'Passe d\'abord le diagnostic.')
}

function requireModule(subject: Subject, s: SubjectState | undefined, n: number) {
  requireProfile(s)
  const module = findModule(subject, n)
  if (!moduleUnlocked(subject, s, n)) throw new HttpError(403, `Le module ${n} n'est pas encore débloqué.`)
  return module
}

export async function listSubjects(): Promise<SubjectSummary[]> {
  const state = await readState()
  const subjects = await Promise.all((await listSubjectIds()).map(loadSubject))
  return subjects.map((s) => ({ id: s.id, title: s.title, description: s.description, started: !!state.subjects[s.id]?.profile }))
}

export async function overview(subjectId: string): Promise<SubjectOverview> {
  const { subject, s } = await snapshot(subjectId)
  return {
    id: subject.id,
    title: subject.title,
    description: subject.description,
    profile: s?.profile
      ? { objective: s.profile.objective, rhythm: s.profile.rhythm, selfLevel: s.profile.selfLevel, suggestedModule: s.profile.suggestedModule }
      : null,
    session: s?.session ? { startedAt: s.session.startedAt } : null,
    lastSessionAt: s?.lastSessionAt ?? null,
    modules: subject.modules.map((m) => moduleSummary(subject, s, m)),
    position: currentPosition(subject, s),
    progressionFile: progressionFile(subject.id),
  }
}

export async function diagnosticQuestions(subjectId: string): Promise<PublicQuestion[]> {
  return (await loadSubject(subjectId)).diagnostic.map(toPublicQuestion)
}

export function submitDiagnostic(subjectId: string, payload: DiagnosticPayload): Promise<{ suggestedModule: number }> {
  return change(subjectId, (subject, s) => {
    if (s.profile) throw new HttpError(409, 'Le diagnostic a déjà été passé.')
    const { module, score } = suggestModule(subject, payload.answers)
    s.profile = {
      objective: payload.objective.trim(),
      rhythm: payload.rhythm.trim(),
      selfLevel: payload.selfLevel.trim(),
      diagnostic: payload.answers,
      diagnosticScore: score,
      suggestedModule: module,
    }
    s.results.push({ date: now(), module, activity: 'Diagnostic', result: `${score} — départ suggéré : module ${module}` })
    return { suggestedModule: module }
  })
}

export async function moduleView(subjectId: string, n: number): Promise<ModuleView> {
  const { subject, s } = await snapshot(subjectId)
  const module = requireModule(subject, s, n)
  const ms = moduleState(s, n)
  const progress = (states: typeof ms.quiz, id: string) => {
    const qs = states[id]
    return { attempts: qs?.attempts ?? 0, solved: !!qs?.solved, ...(qs?.justification ? { justification: qs.justification } : {}) }
  }
  return {
    ...moduleSummary(subject, s, module),
    cours: module.cours,
    comprehension: module.comprehension.map((q) => ({ question: toPublicQuestion(q), progress: progress(ms.comprehension, q.id) })),
    quiz: module.quiz.map((q) => ({ question: toPublicQuestion(q), progress: progress(ms.quiz, q.id) })),
    exercises: module.exercises.map((e) => {
      const es = ms.exercises[e.id]
      return {
        id: e.id,
        type: e.type,
        title: e.title,
        summary: e.summary,
        started: !!es?.startedAt,
        passed: exerciseDone(e, es),
        hintsUsed: es?.hintsRevealed ?? 0,
      }
    }),
  }
}

export function testOut(subjectId: string, n: number): Promise<void> {
  return change(subjectId, (subject, s) => {
    const module = requireModule(subject, s, n)
    const ms = ensureModuleState(s, n)
    if (validationPassed(module, ms)) throw new HttpError(409, 'Module déjà validé.')
    ms.testOut = true
    s.journal.push({ date: now(), source: 'site', text: `Test de sortie demandé pour le module ${n}.` })
  })
}

export function answerQuestion(
  subjectId: string,
  n: number,
  kind: QuestionKind,
  questionId: string,
  option: number,
  justification: string | undefined,
): Promise<AnswerResult> {
  return change(subjectId, (subject, s) => {
    const module = requireModule(subject, s, n)
    const ms = ensureModuleState(s, n)
    if (!stepUnlocked(module, ms, kind === 'quiz' ? 'quiz' : 'cours')) throw new HttpError(403, 'Étape pas encore débloquée.')
    const questions = kind === 'quiz' ? module.quiz : module.comprehension
    const states = kind === 'quiz' ? ms.quiz : ms.comprehension
    const question = questions.find((q) => q.id === questionId)
    if (!question) throw new HttpError(404, 'Question inconnue.')
    if (question.justify && (justification?.trim().length ?? 0) < MIN_QUESTION_JUSTIFICATION_LENGTH) {
      throw new HttpError(400, 'Justifie ta réponse en une ou deux phrases.')
    }
    const wasDone = stepDone(module, ms, kind === 'quiz' ? 'quiz' : 'cours')
    const result = evaluateAnswer(question, option)
    states[questionId] = recordAnswer(states[questionId], result.correct)
    if (question.justify && result.correct) states[questionId].justification = justification!.trim()
    const step = kind === 'quiz' ? 'quiz' : 'cours'
    if (!wasDone && stepDone(module, ms, step)) {
      s.results.push({
        date: now(),
        module: n,
        activity: kind === 'quiz' ? 'Quiz' : 'Questions de compréhension',
        result: scoreLine(questions, states),
      })
    }
    return result
  })
}

export async function exerciseView(subjectId: string, n: number, id: string): Promise<ExerciseView> {
  const { subject, s } = await snapshot(subjectId)
  const module = requireModule(subject, s, n)
  const exercise = findExercise(module, id)
  const ms = moduleState(s, n)
  if (!stepUnlocked(module, ms, exerciseStep(exercise.type))) throw new HttpError(403, 'Étape pas encore débloquée.')
  const es = ms.exercises[id] ?? emptyExerciseState()
  const exhausted = exercise.hints.length > 0 && es.hintsRevealed >= exercise.hints.length && !es.passedAt
  return {
    module: n,
    moduleTitle: module.title,
    id,
    type: exercise.type,
    title: exercise.title,
    summary: exercise.summary,
    consigne: exercise.consigne,
    workdir: exerciseWorkdir(subjectId, n, id),
    started: !!es.startedAt,
    passed: !!es.passedAt,
    checkRuns: es.checkRuns,
    lastCheck: es.lastCheck ?? null,
    hints: {
      revealed: exercise.hints.slice(0, es.hintsRevealed),
      total: exercise.hints.length,
      canUnlock: hintLock(exercise, es) === null,
      lockedReason: hintLock(exercise, es),
    },
    relay: exhausted
      ? `claude "Reprends ma formation ${subjectId} avec le skill coach-formation : je suis bloqué sur formation/${subjectId}/module-${n}/exercice-${id}"`
      : null,
    review: es.passedAt && exercise.review.length ? exercise.review : null,
    justification:
      exercise.type === 'validation'
        ? {
            questions: exercise.justifications,
            answers: es.justifications ?? null,
            explanation: es.explanation ? { verdict: es.explanation.verdict, ...(es.explanation.note ? { note: es.explanation.note } : {}) } : null,
          }
        : null,
  }
}

async function copyMissing(from: string, to: string, created: string[], skipped: string[], base: string) {
  await mkdir(to, { recursive: true })
  for (const entry of await readdir(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name)
    const dest = path.join(to, entry.name)
    if (entry.isDirectory()) {
      await copyMissing(src, dest, created, skipped, base)
    } else if (existsSync(dest)) {
      skipped.push(path.relative(base, dest))
    } else {
      await copyFile(src, dest)
      created.push(path.relative(base, dest))
    }
  }
}

// Copies the brief and skeleton into the learner's workspace, never overwriting their files.
export function startExercise(subjectId: string, n: number, id: string): Promise<StartResult> {
  return change(subjectId, async (subject, s) => {
    const module = requireModule(subject, s, n)
    const exercise = findExercise(module, id)
    const ms = ensureModuleState(s, n)
    if (!stepUnlocked(module, ms, exerciseStep(exercise.type))) throw new HttpError(403, 'Étape pas encore débloquée.')
    const workdir = exerciseWorkdir(subjectId, n, id)
    const created: string[] = []
    const skipped: string[] = []
    await mkdir(workdir, { recursive: true })
    const consigne = path.join(workdir, 'CONSIGNE.md')
    if (existsSync(consigne)) skipped.push('CONSIGNE.md')
    else {
      await copyFile(path.join(exercise.dir, 'CONSIGNE.md'), consigne)
      created.push('CONSIGNE.md')
    }
    if (exercise.skeletonDir) await copyMissing(exercise.skeletonDir, workdir, created, skipped, workdir)
    const es = ensureExerciseState(ms, id)
    es.startedAt ??= now()
    return { workdir, created, skipped }
  })
}

export async function checkExercise(subjectId: string, n: number, id: string): Promise<CheckResponse> {
  const { subject, s } = await snapshot(subjectId)
  const module = requireModule(subject, s, n)
  const exercise = findExercise(module, id)
  const es = moduleState(s, n).exercises[id]
  if (!es?.startedAt) throw new HttpError(409, "Commence l'exercice d'abord.")
  await assertDockerAvailable()
  // Checks may take minutes (builds): run them outside the state lock.
  const results = await runChecks(exercise.checkFile, exerciseWorkdir(subjectId, n, id))
  const passed = results.every((r) => r.ok)
  return change(subjectId, (_subject, s) => {
    const es = ensureExerciseState(ensureModuleState(s, n), id)
    es.checkRuns += 1
    es.checksSinceHint += 1
    es.lastCheck = { at: now(), results }
    const newlyPassed = passed && !es.passedAt
    if (newlyPassed) {
      es.passedAt = now()
      const hints = exercise.type === 'validation' ? 'sans aide' : `${es.hintsRevealed} indice(s)`
      s.results.push({ date: now(), module: n, activity: `${exercise.type} ${id} — ${exercise.title}`, result: `réussi (${es.checkRuns} vérification(s), ${hints})` })
    }
    return { results, passed: !!es.passedAt, newlyPassed }
  })
}

export function revealHint(subjectId: string, n: number, id: string, tried: string): Promise<void> {
  return change(subjectId, (subject, s) => {
    const module = requireModule(subject, s, n)
    const exercise = findExercise(module, id)
    const es = ensureExerciseState(ensureModuleState(s, n), id)
    const lock = hintLock(exercise, es)
    if (lock) throw new HttpError(409, lock)
    if (tried.trim().length < MIN_TRIED_LENGTH) throw new HttpError(400, "Décris ce que tu as essayé et ce que tu as observé.")
    es.hintsRevealed += 1
    es.checksSinceHint = 0
    es.tried.push({ at: now(), hintLevel: es.hintsRevealed, text: tried.trim() })
  })
}

export function submitJustifications(subjectId: string, n: number, id: string, answers: string[]): Promise<void> {
  return change(subjectId, (subject, s) => {
    const module = requireModule(subject, s, n)
    const exercise = findExercise(module, id)
    if (exercise.type !== 'validation') throw new HttpError(400, 'Seule la validation demande des justifications.')
    const es = ensureExerciseState(ensureModuleState(s, n), id)
    if (!es.passedAt) throw new HttpError(409, 'Réussis d\'abord les critères techniques.')
    if (answers.length !== exercise.justifications.length || answers.some((a) => a.trim().length < MIN_JUSTIFICATION_LENGTH)) {
      throw new HttpError(400, `Réponds à chaque question en quelques phrases (${MIN_JUSTIFICATION_LENGTH} caractères minimum).`)
    }
    es.justifications = answers.map((a) => a.trim())
    delete es.explanation
    s.results.push({ date: now(), module: n, activity: `Validation ${id}`, result: 'critères réussis seul, explications à défendre en séance coach' })
  })
}

export function startSession(subjectId: string): Promise<SessionStart> {
  return change(subjectId, (subject, s) => {
    requireProfile(s)
    const position = currentPosition(subject, s)
    const candidates = warmupCandidates(subject, s, position?.module ?? 1)
    const pick = candidates[Math.floor(Math.random() * candidates.length)]
    s.session = {
      startedAt: now(),
      ...(pick ? { warmup: { module: pick.module, questionId: pick.question.id, attempts: 0, solved: false } } : {}),
    }
    return {
      rappel: { lastJournal: s.journal.at(-1)?.text ?? null, fragile: fragilePoints(subject, s), position },
      warmup: pick ? { module: pick.module, question: toPublicQuestion(pick.question) } : null,
    }
  })
}

export function answerWarmup(subjectId: string, option: number): Promise<AnswerResult> {
  return change(subjectId, (subject, s) => {
    const warmup = s.session?.warmup
    if (!warmup || warmup.solved) throw new HttpError(409, "Pas d'échauffement en cours.")
    const question = findModule(subject, warmup.module).quiz.find((q) => q.id === warmup.questionId)
    if (!question) throw new HttpError(404, 'Question inconnue.')
    const result = evaluateAnswer(question, option)
    warmup.attempts += 1
    if (result.correct) {
      warmup.solved = true
      s.results.push({
        date: now(),
        module: warmup.module,
        activity: `Échauffement (quiz ${question.id})`,
        result: warmup.attempts === 1 ? 'réussi du premier coup' : `réussi en ${warmup.attempts} essais`,
      })
    }
    return result
  })
}

export function endSession(subjectId: string, note: string): Promise<SessionEnd> {
  return change(subjectId, (subject, s) => {
    requireProfile(s)
    const since = s.session?.startedAt ?? s.lastSessionAt ?? s.startedAt
    const done = s.results.filter((r) => r.date >= since && r.activity !== 'Diagnostic').map((r) => `${r.activity} (${r.result})`)
    const fragile = subject.modules
      .filter((m) => m.authored)
      .flatMap((m) =>
        m.competences
          .filter((c) => ['fragile', 'a-defendre'].includes(competenceStatus(m, moduleState(s, m.number), c.id)))
          .map((c) => `M${m.number} ${c.text}`),
      )
    const position = currentPosition(subject, s)
    const bilan: SessionEnd = {
      reussi: done.length ? done.join(' ; ') : 'Rien de terminé pendant cette séance.',
      fragile: fragile.length ? fragile.join(' ; ') : 'Aucune compétence fragile identifiée.',
      prochaineFois: position ? position.label : 'Programme terminé.',
    }
    const text = [`Réussi : ${bilan.reussi}`, `Fragile : ${bilan.fragile}`, `Prochaine fois : ${bilan.prochaineFois}`]
    if (note.trim()) text.push(`Ressenti : ${note.trim()}`)
    s.journal.push({ date: now(), source: 'site', text: text.join(' — ') })
    s.lastSessionAt = now()
    delete s.session
    return bilan
  })
}

export function recordExplanation(subjectId: string, n: number, verdict: 'ok' | 'ko', note: string): Promise<string> {
  return change(subjectId, (subject, s) => {
    const module = findModule(subject, n)
    const ms = ensureModuleState(s, n)
    const validations = module.exercises.filter((e) => e.type === 'validation')
    const pending = validations.find((e) => ms.exercises[e.id]?.passedAt && ms.exercises[e.id]?.justifications)
    if (!pending) throw new HttpError(409, `Aucune validation du module ${n} n'attend d'explication.`)
    const es = ms.exercises[pending.id]
    es.explanation = { verdict, at: now(), ...(note ? { note } : {}) }
    if (verdict === 'ko') {
      delete es.passedAt
      delete es.justifications
    }
    const result = verdict === 'ok' ? 'explications défendues : compétences validées' : 'explications insuffisantes : validation à refaire'
    s.results.push({ date: now(), module: n, activity: `Validation ${pending.id} (coach)`, result })
    s.journal.push({ date: now(), source: 'coach', text: `Module ${n} — ${result}${note ? ` : ${note}` : ''}` })
    return result
  })
}

export function addCoachNote(subjectId: string, text: string): Promise<void> {
  return change(subjectId, (_subject, s) => {
    s.journal.push({ date: now(), source: 'coach', text: text.trim() })
  })
}
