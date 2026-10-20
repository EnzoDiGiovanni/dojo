import { CheckCircle2, Circle, Lock } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { STEP_LABELS, type ModuleView, type Step, type SubjectOverview } from '../../shared/api'
import { api } from '../api'
import { Breadcrumb } from '../components/Breadcrumb'
import { Markdown } from '../components/Markdown'
import { QuestionCard } from '../components/QuestionCard'
import { Button, Card, ErrorBox, Loading, StatusTag } from '../components/ui'
import { useLoad } from '../useLoad'
import { Inline } from '../components/Inline'

const EXERCISE_STEP_INTRO: Partial<Record<Step, string>> = {
  application: 'Une notion par exercice, consignes précises. Fais-les dans l\'ordre.',
  intermediaire: 'Plusieurs notions combinées, consignes moins guidées : à toi de découvrir les cas limites.',
  defi: 'Un vrai problème. Lis le symptôme, formule des hypothèses, vérifie-les une par une.',
  validation: 'Un exercice inédit, sans aucun indice. Ensuite, tu justifies tes choix.',
}

export function ModulePage() {
  const { subject = '', module = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const { data, error, reload } = useLoad(() => api.get<ModuleView>(`/subjects/${subject}/modules/${module}`), [subject, module])
  const { data: overview } = useLoad(() => api.get<SubjectOverview>(`/subjects/${subject}`), [subject])

  if (error) return <ErrorBox message={error} />
  if (!data) return <Loading />

  const defaultStep = data.steps.find((s) => s.unlocked && !s.done)?.step ?? 'cours'
  const step = (params.get('step') as Step | null) ?? defaultStep
  const view = data.steps.find((s) => s.step === step) ?? data.steps[0]
  const base = `/subjects/${subject}/modules/${module}`

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Sujets', to: '/' }, { label: overview?.title ?? subject, to: `/s/${subject}` }, { label: `Module ${data.number}` }]} />
      <div>
        <h1 className="text-2xl font-bold">
          Module {data.number} — {data.title}
        </h1>
        <ul className="mt-3 space-y-1">
          {data.competences.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-4 text-sm">
              <span className="text-ink-muted">
                <Inline text={c.text} />
              </span>
              <StatusTag status={c.status} />
            </li>
          ))}
        </ul>
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-line">
        {data.steps.map((s) => (
          <button
            key={s.step}
            disabled={!s.unlocked}
            onClick={() => setParams({ step: s.step })}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${
              s.step === view.step ? 'border-accent text-ink' : 'border-transparent text-ink-muted hover:text-ink'
            } ${!s.unlocked ? 'opacity-50' : ''}`}
          >
            {s.done ? <CheckCircle2 className="h-4 w-4 text-ok" /> : s.unlocked ? <Circle className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {STEP_LABELS[s.step]}
          </button>
        ))}
      </nav>

      {!view.unlocked ? (
        <p className="text-ink-muted">Cette étape se débloque quand les précédentes sont réussies.</p>
      ) : view.step === 'cours' ? (
        <div className="space-y-6">
          <Card className="p-6 sm:p-8">{data.cours && <Markdown>{data.cours}</Markdown>}</Card>
          {data.comprehension.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Vérifie ta compréhension</h2>
              <p className="text-sm text-ink-muted">Réponds à ces questions pour débloquer les exercices. Une erreur ne coûte rien, sauf de te faire réfléchir.</p>
              {data.comprehension.map(({ question, progress }, i) => (
                <QuestionCard
                  key={question.id}
                  index={`Q${i + 1}`}
                  question={question}
                  progress={progress}
                  onAnswer={(option, justification) => api.post(`${base}/questions/comprehension/${question.id}`, { option, justification })}
                  onSolved={reload}
                />
              ))}
            </section>
          )}
        </div>
      ) : view.step === 'quiz' ? (
        <QuizRunner data={data} base={base} onChange={reload} />
      ) : (
        <ExerciseList data={data} step={view.step} subject={subject} />
      )}
    </div>
  )
}

function QuizRunner({ data, base, onChange }: { data: ModuleView; base: string; onChange(): void }) {
  const firstOpen = data.quiz.findIndex((q) => !q.progress.solved)
  const [index, setIndex] = useState(firstOpen === -1 ? data.quiz.length : firstOpen)
  const [solvedCurrent, setSolvedCurrent] = useState(false)

  if (index >= data.quiz.length) {
    const first = data.quiz.filter((q) => q.progress.attempts === 1 && q.progress.solved).length
    return (
      <Card>
        <h2 className="font-semibold">Quiz terminé</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {first}/{data.quiz.length} au premier essai. Les questions ratées au premier essai reviendront en échauffement.
        </p>
      </Card>
    )
  }

  const { question, progress } = data.quiz[index]
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Question {index + 1} / {data.quiz.length} — le score retenu est celui du premier essai.
      </p>
      <QuestionCard
        key={question.id}
        question={question}
        progress={progress}
        onAnswer={(option, justification) => api.post(`${base}/questions/quiz/${question.id}`, { option, justification })}
        onSolved={() => setSolvedCurrent(true)}
      />
      {(solvedCurrent || progress.solved) && (
        <Button
          onClick={() => {
            setSolvedCurrent(false)
            setIndex(index + 1)
            onChange()
          }}
        >
          {index === data.quiz.length - 1 ? 'Voir mon score' : 'Question suivante'}
        </Button>
      )}
    </div>
  )
}

function ExerciseList({ data, step, subject }: { data: ModuleView; step: Step; subject: string }) {
  const exercises = data.exercises.filter((e) => e.type === step)
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">{EXERCISE_STEP_INTRO[step]}</p>
      {exercises.map((e) => (
        <Link key={e.id} to={`/s/${subject}/m/${data.number}/e/${e.id}`} className="block">
          <Card className="transition hover:border-accent">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{e.title}</h3>
                <p className="mt-1 text-sm text-ink-muted">
                  <Inline text={e.summary} />
                </p>
              </div>
              <span className={`shrink-0 text-xs font-medium ${e.passed ? 'text-ok' : e.started ? 'text-accent' : 'text-ink-muted'}`}>
                {e.passed ? `✓ réussi${e.hintsUsed ? ` (${e.hintsUsed} indice${e.hintsUsed > 1 ? 's' : ''})` : ' seul'}` : e.started ? 'en cours' : 'à faire'}
              </span>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}
