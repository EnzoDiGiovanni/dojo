import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { SubjectSummary } from '../../shared/api'
import { api } from '../api'
import { Card, ErrorBox, Loading } from '../components/ui'
import { useLoad } from '../useLoad'

export function Home() {
  const { data, error } = useLoad(() => api.get<SubjectSummary[]>('/subjects'), [])
  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold">Choisis ton sujet</h1>
        <p className="mt-2 text-ink-muted">
          Cours, exercices sur ta machine, quiz, défis, validation. Ici, personne ne te donne la réponse : quand tu bloques, tu reçois
          des questions, pas des solutions.
        </p>
      </div>
      <ErrorBox message={error} />
      {!data && !error && <Loading />}
      <div className="grid gap-4 sm:grid-cols-2">
        {data?.map((s) => (
          <Link key={s.id} to={`/s/${s.id}`} className="group">
            <Card className="h-full transition group-hover:border-accent">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold">{s.title}</h2>
                <ArrowRight className="h-5 w-5 text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-accent" />
              </div>
              <p className="mt-2 text-sm text-ink-muted">{s.description}</p>
              <p className="mt-4 text-sm font-medium text-accent">{s.started ? 'Reprendre' : 'Commencer par le diagnostic'}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
