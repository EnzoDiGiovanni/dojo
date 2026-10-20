import { useState } from 'react'
import type { PublicQuestion, SubjectOverview } from '../../shared/api'
import { api } from '../api'
import { Button, Card, ErrorBox, Loading, Textarea } from '../components/ui'
import { useLoad } from '../useLoad'
import { Inline } from '../components/Inline'

const LEVELS = ['Grand débutant', 'Débutant : quelques commandes copiées-collées', 'Intermédiaire : je l\'utilise sans tout comprendre', 'Avancé']

// Positioning questions get no feedback at all: they only pick a starting module.
export function Diagnostic({ subject, onDone }: { subject: SubjectOverview; onDone(): void }) {
  const { data: questions, error: loadError } = useLoad(() => api.get<PublicQuestion[]>(`/subjects/${subject.id}/diagnostic`), [subject.id])
  const [phase, setPhase] = useState<'profil' | 'questions' | 'resultat'>('profil')
  const [objective, setObjective] = useState('')
  const [rhythm, setRhythm] = useState('')
  const [selfLevel, setSelfLevel] = useState(LEVELS[1])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [index, setIndex] = useState(0)
  const [suggested, setSuggested] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (loadError) return <ErrorBox message={loadError} />
  if (!questions) return <Loading />

  const submit = async () => {
    setError(null)
    try {
      const res = await api.post<{ suggestedModule: number }>(`/subjects/${subject.id}/diagnostic`, { objective, rhythm, selfLevel, answers })
      setSuggested(res.suggestedModule)
      setPhase('resultat')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  if (phase === 'profil') {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{subject.title} — diagnostic</h1>
          <p className="mt-2 text-ink-muted">
            Avant tout cours, on fait le point : ton objectif, ton rythme, puis {questions.length} questions de positionnement. Tu n'auras
            pas la correction : elles servent seulement à choisir où tu commences.
          </p>
        </div>
        <Card className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium">Pourquoi veux-tu apprendre {subject.title} ? Pour faire quoi concrètement ?</label>
            <Textarea value={objective} onChange={(e) => setObjective(e.target.value)} rows={3} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Combien de temps par séance ?</label>
            <input
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
              value={rhythm}
              onChange={(e) => setRhythm(e.target.value)}
              placeholder="ex. 45 min, 3 soirs par semaine"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Ton niveau ressenti</label>
            <select
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm"
              value={selfLevel}
              onChange={(e) => setSelfLevel(e.target.value)}
            >
              {LEVELS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <Button disabled={objective.trim().length < 10 || !rhythm.trim()} onClick={() => setPhase('questions')}>
            Passer aux questions
          </Button>
        </Card>
      </div>
    )
  }

  if (phase === 'questions') {
    const q = questions[index]
    const last = index === questions.length - 1
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <p className="text-sm text-ink-muted">
          Question {index + 1} / {questions.length} — si tu ne sais pas, choisis « Je ne sais pas » : c'est une information utile.
        </p>
        <Card>
          <p className="font-medium whitespace-pre-line">
            <Inline text={q.prompt} />
          </p>
          {q.code && <pre className="code mt-3">{q.code}</pre>}
          <div className="mt-4 space-y-2">
            {q.options.map((option, i) => (
              <label
                key={i}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm ${
                  answers[q.id] === i ? 'border-accent bg-accent-soft' : 'border-line hover:bg-card-muted'
                }`}
              >
                <input type="radio" className="mt-1" checked={answers[q.id] === i} onChange={() => setAnswers({ ...answers, [q.id]: i })} />
                <span>
                  <Inline text={option} />
                </span>
              </label>
            ))}
          </div>
          <div className="mt-5 flex gap-2">
            {index > 0 && (
              <Button variant="ghost" onClick={() => setIndex(index - 1)}>
                Précédente
              </Button>
            )}
            <Button disabled={answers[q.id] === undefined} onClick={() => (last ? submit() : setIndex(index + 1))}>
              {last ? 'Terminer le diagnostic' : 'Suivante'}
            </Button>
          </div>
        </Card>
        <ErrorBox message={error} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="space-y-4">
        <h1 className="text-xl font-bold">Ton point de départ : module {suggested}</h1>
        <p className="text-sm text-ink-muted">
          Chaque module suit le même cycle : cours, exercices d'application, quiz, exercices intermédiaires, défi, puis une validation
          réalisée sans aucune aide. Une étape se débloque quand la précédente est réussie.
        </p>
        <p className="text-sm text-ink-muted">
          Les exercices se font dans ton terminal et ton éditeur, dans le dossier <code>formation/</code> du projet. Le site vérifie ton
          travail sur ta machine et te dit quels critères sont remplis, jamais pourquoi les autres ne le sont pas.
        </p>
        {suggested !== null && suggested > 1 && (
          <p className="text-sm text-ink-muted">
            Les modules précédents restent ouverts : tu peux y passer directement le test de sortie pour prouver que tu les maîtrises.
          </p>
        )}
        <Button onClick={onDone}>Voir mon programme</Button>
      </Card>
    </div>
  )
}
