import { Check, Copy, Loader2, X } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import type { CheckResponse, ExerciseView, HintLevel, StartResult, SubjectOverview } from '../../shared/api'
import { api } from '../api'
import { Breadcrumb } from '../components/Breadcrumb'
import { Markdown } from '../components/Markdown'
import { Button, Card, ErrorBox, Loading, Textarea } from '../components/ui'
import { useLoad } from '../useLoad'
import { Inline } from '../components/Inline'

const TYPE_LABEL: Record<ExerciseView['type'], string> = {
  application: 'Application',
  intermediaire: 'Intermédiaire',
  defi: 'Défi',
  validation: 'Validation — sans aide',
}

const HINT_LABEL: Record<HintLevel, string> = {
  comprehension: 'Ta compréhension',
  demarche: 'Ta démarche',
  zone: 'La zone du problème',
  concept: 'Le concept en jeu',
}

export function Exercise() {
  const { subject = '', module = '', exercise = '' } = useParams()
  const base = `/subjects/${subject}/modules/${module}/exercises/${exercise}`
  const { data, error, reload } = useLoad(() => api.get<ExerciseView>(base), [base])
  const { data: overview } = useLoad(() => api.get<SubjectOverview>(`/subjects/${subject}`), [subject])
  const [start, setStart] = useState<StartResult | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  if (error) return <ErrorBox message={error} />
  if (!data) return <Loading />

  const act = async (fn: () => Promise<void>) => {
    setActionError(null)
    try {
      await fn()
      reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e))
    }
  }

  const runCheck = () =>
    act(async () => {
      setChecking(true)
      try {
        await api.post<CheckResponse>(`${base}/check`)
      } finally {
        setChecking(false)
      }
    })

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Sujets', to: '/' },
          { label: overview?.title ?? subject, to: `/s/${subject}` },
          { label: `Module ${data.module}`, to: `/s/${subject}/m/${data.module}?step=${data.type}` },
          { label: data.title },
        ]}
      />
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{TYPE_LABEL[data.type]}</p>
        <h1 className="text-2xl font-bold">{data.title}</h1>
        <p className="mt-1 text-ink-muted">
          <Inline text={data.summary} />
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <Card className="p-6 sm:p-8">
            <Markdown>{data.consigne}</Markdown>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="space-y-3">
            <h2 className="font-semibold">Ton espace de travail</h2>
            {data.started ? (
              <>
                <CopyLine text={`cd ${data.workdir}`} />
                {start && start.created.length > 0 && <p className="text-xs text-ink-muted">Fichiers créés : {start.created.join(', ')}</p>}
                {start && start.skipped.length > 0 && (
                  <p className="text-xs text-ink-muted">Déjà présents, non modifiés : {start.skipped.join(', ')}</p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-ink-muted">Crée le dossier de l'exercice avec la consigne et les fichiers de départ.</p>
                <Button onClick={() => act(async () => setStart(await api.post<StartResult>(`${base}/start`)))}>Commencer</Button>
              </>
            )}
          </Card>

          {data.started && (
            <Card className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">Vérification</h2>
                {data.checkRuns > 0 && <span className="text-xs text-ink-muted">{data.checkRuns} lancée(s)</span>}
              </div>
              <Button onClick={runCheck} disabled={checking} className="w-full">
                {checking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Vérification…
                  </>
                ) : (
                  'Vérifier mon travail'
                )}
              </Button>
              {checking && <p className="text-xs text-ink-muted">Certains critères construisent ou lancent ton image : ça peut prendre une minute.</p>}
              {data.lastCheck && (
                <ul className="space-y-2">
                  {data.lastCheck.results.map((r) => (
                    <li key={r.id} className={`rounded-lg px-3 py-2 text-sm ${r.ok ? 'bg-ok-soft' : 'bg-ko-soft'}`}>
                      <div className="flex items-start gap-2">
                        {r.ok ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-ko" />}
                        <span>
                          <Inline text={r.label} />
                        </span>
                      </div>
                      {r.observed && (
                        <p className="mt-1 pl-6 text-xs text-ink-muted">
                          <Inline text={r.observed} />
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {data.passed && (
            <Card className="space-y-2 border-ok/40">
              <h2 className="font-semibold text-ok">Réussi{data.type !== 'validation' && data.hints.revealed.length === 0 ? ' seul' : ''}</h2>
              {data.review && (
                <>
                  <p className="text-sm text-ink-muted">Avant de passer à la suite, réfléchis à ces questions :</p>
                  <ul className="ml-5 list-disc space-y-1 text-sm">
                    {data.review.map((q) => (
                      <li key={q}>
                        <Inline text={q} />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          )}

          {data.type !== 'validation' && data.started && data.hints.total > 0 && <HintPanel data={data} base={base} act={act} />}
          {data.justification && (data.passed || data.justification.explanation?.verdict === 'ko') && (
            <JustificationPanel data={data} base={base} act={act} />
          )}
          <ErrorBox message={actionError} />
        </aside>
      </div>
    </div>
  )
}

function CopyLine({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-start gap-2 rounded-lg bg-card-muted px-3 py-2">
      <code className="min-w-0 flex-1 text-xs break-all">{text}</code>
      <button
        title="Copier"
        className="text-ink-muted hover:text-ink"
        onClick={() => {
          navigator.clipboard.writeText(text).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          })
        }}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  )
}

type Act = (fn: () => Promise<void>) => Promise<void>

function HintPanel({ data, base, act }: { data: ExerciseView; base: string; act: Act }) {
  const [tried, setTried] = useState('')
  const { revealed, total, canUnlock, lockedReason } = data.hints
  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Bloqué ?</h2>
        <span className="text-xs text-ink-muted">
          {revealed.length}/{total} questions
        </span>
      </div>
      {revealed.map((h, i) => (
        <div key={i} className="rounded-lg border border-line px-3 py-2 text-sm">
          <p className="text-xs font-medium text-ink-muted">{HINT_LABEL[h.level]}</p>
          <p className="mt-1">
            <Inline text={h.text} />
          </p>
        </div>
      ))}
      {data.relay ? (
        <div className="space-y-2 rounded-lg bg-accent-soft px-3 py-3 text-sm">
          <p>
            Toutes les questions sont dévoilées. Passe le relais au coach dans Claude Code, depuis la racine du projet Dojo : il lit ta
            progression et te proposera un exercice plus ciblé.
          </p>
          <CopyLine text={data.relay} />
        </div>
      ) : canUnlock ? (
        <div className="space-y-2">
          <label className="block text-sm text-ink-muted">Qu'as-tu essayé, et qu'as-tu observé ?</label>
          <Textarea value={tried} onChange={(e) => setTried(e.target.value)} placeholder="J'ai lancé…, j'ai vu…, je pense que…" />
          <Button
            variant="secondary"
            className="w-full"
            disabled={tried.trim().length < 20}
            onClick={() =>
              act(async () => {
                await api.post(`${base}/hint`, { tried })
                setTried('')
              })
            }
          >
            Obtenir une question pour avancer
          </Button>
        </div>
      ) : (
        lockedReason && !data.passed && <p className="text-sm text-ink-muted">{lockedReason}</p>
      )}
    </Card>
  )
}

function JustificationPanel({ data, base, act }: { data: ExerciseView; base: string; act: Act }) {
  const j = data.justification!
  const [answers, setAnswers] = useState<string[]>(() => j.questions.map(() => ''))
  if (!data.passed) {
    return (
      <Card className="space-y-2">
        <h2 className="font-semibold text-warn">Validation à refaire</h2>
        {j.explanation?.note && <p className="text-sm text-ink-muted">Note du coach : {j.explanation.note}</p>}
      </Card>
    )
  }
  if (j.answers) {
    return (
      <Card className="space-y-3">
        <h2 className="font-semibold">Explications</h2>
        {j.explanation?.verdict === 'ok' ? (
          <p className="text-sm text-ok">Défendues avec le coach : compétences validées.</p>
        ) : (
          <>
            <p className="text-sm text-ink-muted">
              Il te reste à défendre ces choix à l'oral avec le coach Claude Code (depuis la racine du projet Dojo). Il ne validera que si
              tu sais expliquer.
            </p>
            <CopyLine text={`claude "Reprends ma formation avec le skill coach-formation : j'ai des explications à défendre (module ${data.module})"`} />
          </>
        )}
        {j.explanation?.note && <p className="text-xs text-ink-muted">Note du coach : {j.explanation.note}</p>}
      </Card>
    )
  }
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">Justifie tes choix</h2>
      {j.questions.map((q, i) => (
        <div key={q}>
          <label className="mb-1 block text-sm font-medium">
            <Inline text={q} />
          </label>
          <Textarea rows={4} value={answers[i]} onChange={(e) => setAnswers(answers.map((a, k) => (k === i ? e.target.value : a)))} />
        </div>
      ))}
      <Button
        className="w-full"
        disabled={answers.some((a) => a.trim().length < 30)}
        onClick={() => act(() => api.post(`${base}/justify`, { answers }).then(() => undefined))}
      >
        Envoyer mes justifications
      </Button>
    </Card>
  )
}
