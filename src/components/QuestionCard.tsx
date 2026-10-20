import { useState } from 'react'
import type { AnswerResult, PublicQuestion, QuestionProgress } from '../../shared/api'
import { Button, Card, ErrorBox, Textarea } from './ui'
import { Inline } from './Inline'

const TYPE_LABEL: Record<PublicQuestion['type'], string> = {
  qcm: 'QCM',
  'vrai-faux': 'Vrai ou faux — justifie',
  prediction: 'Que va-t-il se passer ?',
}

interface Props {
  question: PublicQuestion
  progress: QuestionProgress
  index?: string
  onAnswer(option: number, justification?: string): Promise<AnswerResult>
  onSolved?(): void
}

// The correct option is never revealed: a wrong answer only yields a follow-up question.
export function QuestionCard({ question, progress, index, onAnswer, onSolved }: Props) {
  const [selected, setSelected] = useState<number | null>(null)
  const [justification, setJustification] = useState('')
  const [tried, setTried] = useState<number[]>([])
  const [relance, setRelance] = useState<string | null>(null)
  const [solved, setSolved] = useState(progress.solved)
  const [attempts, setAttempts] = useState(progress.attempts)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (selected === null) return
    setBusy(true)
    setError(null)
    try {
      const result = await onAnswer(selected, question.justify ? justification : undefined)
      setAttempts((a) => a + 1)
      if (result.correct) {
        setSolved(true)
        setRelance(null)
        onSolved?.()
      } else {
        setTried((t) => [...t, selected])
        setRelance(result.relance ?? 'Relis la question et reprends ton raisonnement.')
        setSelected(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
        <span>
          {index ? `${index} · ` : ''}
          {TYPE_LABEL[question.type]}
        </span>
        {solved && <span className="text-ok normal-case">✓ trouvée en {attempts} essai{attempts > 1 ? 's' : ''}</span>}
      </div>
      <p className="font-medium leading-relaxed whitespace-pre-line">
        <Inline text={question.prompt} />
      </p>
      {question.code && <pre className="code mt-3">{question.code}</pre>}

      {!solved && (
        <>
          <div className="mt-4 space-y-2">
            {question.options.map((option, i) => {
              const wasTried = tried.includes(i)
              return (
                <label
                  key={i}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                    selected === i ? 'border-accent bg-accent-soft' : 'border-line hover:bg-card-muted'
                  } ${wasTried ? 'opacity-55' : ''}`}
                >
                  <input type="radio" className="mt-1" name={question.id} checked={selected === i} onChange={() => setSelected(i)} />
                  <span className="whitespace-pre-line">
                    <Inline text={option} />
                    {wasTried && <span className="ml-2 text-xs text-ink-muted">(déjà essayé)</span>}
                  </span>
                </label>
              )
            })}
          </div>
          {question.justify && (
            <div className="mt-4">
              <label className="mb-1 block text-sm text-ink-muted">Pourquoi ? (obligatoire)</label>
              <Textarea value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Ton raisonnement en une ou deux phrases" />
            </div>
          )}
          {relance && (
            <p className="mt-4 rounded-lg border border-warn/30 bg-warn-soft px-4 py-3 text-sm">
              <span className="font-semibold">Pas encore. </span>
              <Inline text={relance} />
            </p>
          )}
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={submit} disabled={selected === null || busy || (question.justify && justification.trim().length < 15)}>
              Valider ma réponse
            </Button>
          </div>
          <div className="mt-3">
            <ErrorBox message={error} />
          </div>
        </>
      )}
      {solved && progress.justification && (
        <p className="mt-3 text-sm text-ink-muted">Ta justification : {progress.justification}</p>
      )}
    </Card>
  )
}
