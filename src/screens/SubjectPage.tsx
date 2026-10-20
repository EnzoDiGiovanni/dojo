import { Lock } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { STEP_LABELS, type ModuleSummary, type SessionEnd, type SessionStart, type SubjectOverview } from '../../shared/api'
import { api } from '../api'
import { Breadcrumb } from '../components/Breadcrumb'
import { QuestionCard } from '../components/QuestionCard'
import { Button, ButtonLink, Card, ErrorBox, Loading, StatusTag, Textarea } from '../components/ui'
import { useLoad } from '../useLoad'
import { Diagnostic } from './Diagnostic'
import { Inline } from '../components/Inline'

export function SubjectPage() {
  const { subject = '' } = useParams()
  const { data, error, reload } = useLoad(() => api.get<SubjectOverview>(`/subjects/${subject}`), [subject])
  if (error) return <ErrorBox message={error} />
  if (!data) return <Loading />
  return (
    <>
      <Breadcrumb items={[{ label: 'Sujets', to: '/' }, { label: data.title }]} />
      {data.profile ? <Dashboard overview={data} reload={reload} /> : <Diagnostic subject={data} onDone={reload} />}
    </>
  )
}

function Dashboard({ overview, reload }: { overview: SubjectOverview; reload(): void }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{overview.title}</h1>
        <p className="mt-1 text-sm text-ink-muted">Objectif : {overview.profile!.objective}</p>
      </div>
      <SessionPanel overview={overview} reload={reload} />
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Programme</h2>
        {overview.modules.map((m) => (
          <ModuleCard key={m.number} subject={overview.id} module={m} reload={reload} />
        ))}
      </section>
      <p className="text-xs text-ink-muted">
        Progression exportée pour le coach Claude Code : <code>{overview.progressionFile}</code>
      </p>
    </div>
  )
}

function SessionPanel({ overview, reload }: { overview: SubjectOverview; reload(): void }) {
  const [start, setStart] = useState<SessionStart | null>(null)
  const [bilan, setBilan] = useState<SessionEnd | null>(null)
  const [note, setNote] = useState('')
  const [ending, setEnding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const base = `/subjects/${overview.id}`

  const run = async (fn: () => Promise<void>) => {
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  if (bilan) {
    return (
      <Card>
        <h2 className="font-semibold">Bilan de la séance</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div>
            <dt className="font-medium">Réussi</dt>
            <dd className="text-ink-muted">{bilan.reussi}</dd>
          </div>
          <div>
            <dt className="font-medium">Fragile</dt>
            <dd className="text-ink-muted">{bilan.fragile}</dd>
          </div>
          <div>
            <dt className="font-medium">Prochaine fois</dt>
            <dd className="text-ink-muted">{bilan.prochaineFois}</dd>
          </div>
        </dl>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => {
            setBilan(null)
            reload()
          }}
        >
          Fermer
        </Button>
      </Card>
    )
  }

  if (!overview.session) {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold">Prêt pour une séance ?</h2>
          <p className="text-sm text-ink-muted">
            {overview.lastSessionAt ? `Dernière séance le ${new Date(overview.lastSessionAt).toLocaleDateString('fr-FR')}.` : 'Première séance.'}{' '}
            On commence par un rappel et un échauffement.
          </p>
        </div>
        <Button
          onClick={() =>
            run(async () => {
              setStart(await api.post<SessionStart>(`${base}/session/start`))
              reload()
            })
          }
        >
          Démarrer une séance
        </Button>
        <div className="w-full">
          <ErrorBox message={error} />
        </div>
      </Card>
    )
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Séance en cours</h2>
        {overview.position && (
          <ButtonLink to={overview.position.href}>Reprendre : {overview.position.label}</ButtonLink>
        )}
      </div>
      {start && (
        <div className="space-y-3 text-sm">
          {start.rappel.lastJournal && (
            <p>
              <span className="font-medium">La dernière fois — </span>
              <span className="text-ink-muted">{start.rappel.lastJournal}</span>
            </p>
          )}
          {start.rappel.fragile.length > 0 && (
            <div>
              <p className="font-medium">Points fragiles</p>
              <ul className="ml-5 list-disc text-ink-muted">
                {start.rappel.fragile.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}
          {start.warmup && (
            <div>
              <p className="mb-2 font-medium">Échauffement (module {start.warmup.module})</p>
              <QuestionCard
                question={start.warmup.question}
                progress={{ attempts: 0, solved: false }}
                onAnswer={(option) => api.post(`${base}/session/warmup`, { option })}
              />
            </div>
          )}
        </div>
      )}
      {ending ? (
        <div className="space-y-3 border-t border-line pt-4">
          <label className="block text-sm font-medium">Ton ressenti sur cette séance (facultatif)</label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ce qui a coincé, ce qui est devenu clair…" />
          <div className="flex gap-2">
            <Button onClick={() => run(async () => setBilan(await api.post<SessionEnd>(`${base}/session/end`, { note })))}>
              Terminer et faire le bilan
            </Button>
            <Button variant="ghost" onClick={() => setEnding(false)}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setEnding(true)}>
          Terminer la séance
        </Button>
      )}
      <ErrorBox message={error} />
    </Card>
  )
}

function ModuleCard({ subject, module, reload }: { subject: string; module: ModuleSummary; reload(): void }) {
  const [error, setError] = useState<string | null>(null)
  const locked = !module.unlocked
  const testOut = async () => {
    if (!confirm(`Passer directement la validation du module ${module.number} ? Elle se fait sans aucune aide.`)) return
    try {
      await api.post(`/subjects/${subject}/modules/${module.number}/test-out`)
      reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }
  return (
    <Card className={locked ? 'opacity-70' : ''}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Module {module.number}</p>
          <h3 className="text-lg font-semibold">{module.title}</h3>
        </div>
        {!module.authored ? (
          <span className="text-sm text-ink-muted">En préparation</span>
        ) : locked ? (
          <span className="flex items-center gap-1.5 text-sm text-ink-muted">
            <Lock className="h-4 w-4" /> Valide le module précédent
          </span>
        ) : (
          <div className="flex gap-2">
            {module.canTestOut && (
              <Button variant="ghost" onClick={testOut}>
                Test de sortie
              </Button>
            )}
            <ButtonLink to={`/s/${subject}/m/${module.number}`} variant="secondary">
              Ouvrir
            </ButtonLink>
          </div>
        )}
      </div>
      {module.steps.length > 0 && (
        <ol className="mt-4 flex flex-wrap gap-1.5">
          {module.steps.map((s) => (
            <li
              key={s.step}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                s.done ? 'bg-ok-soft text-ok' : s.unlocked ? 'bg-accent-soft text-accent' : 'bg-card-muted text-ink-muted'
              }`}
            >
              {s.done ? '✓ ' : ''}
              {STEP_LABELS[s.step]}
            </li>
          ))}
        </ol>
      )}
      <ul className="mt-4 space-y-1.5">
        {module.competences.map((c) => (
          <li key={c.id} className="flex items-start justify-between gap-4 text-sm">
            <span>
              <Inline text={c.text} />
            </span>
            {module.authored && <StatusTag status={c.status} />}
          </li>
        ))}
      </ul>
      <ErrorBox message={error} />
    </Card>
  )
}
