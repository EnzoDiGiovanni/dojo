import { Link, Route, Routes } from 'react-router-dom'
import { Exercise } from './screens/Exercise'
import { Home } from './screens/Home'
import { ModulePage } from './screens/ModulePage'
import { SubjectPage } from './screens/SubjectPage'

export function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <img src="/favicon.svg" alt="" className="h-6 w-6" />
            Dojo
          </Link>
          <span className="text-sm text-ink-muted">on ne te donne pas les réponses</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/s/:subject" element={<SubjectPage />} />
          <Route path="/s/:subject/m/:module" element={<ModulePage />} />
          <Route path="/s/:subject/m/:module/e/:exercise" element={<Exercise />} />
          <Route path="*" element={<p className="text-ink-muted">Page introuvable.</p>} />
        </Routes>
      </main>
    </div>
  )
}
