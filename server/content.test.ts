// Pedagogical lint of the real content: the rules of the coaching contract that can be checked mechanically.
import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { loadCriteria } from './checks/runner.ts'
import { listSubjectIds, loadSubject, type Question } from './content.ts'

delete process.env.DOJO_CONTENT_DIR

const subjects = await Promise.all((await listSubjectIds()).map(loadSubject))

function criteriaOf(consigne: string): string[] {
  const section = consigne.split(/^## Critères de réussite\s*$/m)[1]?.split(/^## /m)[0] ?? ''
  return section
    .split('\n')
    .filter((l) => l.startsWith('- '))
    .map((l) => l.slice(2).trim())
}

function lintQuestions(questions: Question[], where: string) {
  for (const q of questions) {
    const correct = q.options.filter((o) => o.correct)
    expect(correct, `${where} ${q.id} : exactement une bonne réponse`).toHaveLength(1)
    for (const o of q.options.filter((o) => !o.correct)) {
      expect(o.relance?.trim().endsWith('?'), `${where} ${q.id} « ${o.text} » : relance sous forme de question`).toBe(true)
    }
    if (q.type === 'vrai-faux') expect(q.justify, `${where} ${q.id} : un vrai/faux demande une justification`).toBe(true)
  }
}

for (const subject of subjects) {
  describe(`contenu ${subject.id}`, () => {
    it('a un diagnostic sans correction exploitable et des modules ordonnés', () => {
      expect(subject.diagnostic.length).toBeGreaterThanOrEqual(3)
      for (const q of subject.diagnostic) expect(q.options.filter((o) => o.correct)).toHaveLength(1)
    })

    for (const m of subject.modules.filter((m) => m.authored)) {
      describe(`module ${m.number}`, () => {
        const competenceIds = m.competences.map((c) => c.id)

        it('respecte le cycle complet', () => {
          const types = m.exercises.map((e) => e.type)
          expect(m.comprehension.length).toBeGreaterThanOrEqual(2)
          expect(m.quiz.length).toBeGreaterThanOrEqual(5)
          expect(m.quiz.length).toBeLessThanOrEqual(8)
          for (const type of ['application', 'intermediaire', 'defi', 'validation'] as const) expect(types).toContain(type)
          const validation = m.exercises.find((e) => e.type === 'validation')!
          expect([...validation.competences].sort()).toEqual([...competenceIds].sort())
        })

        it('ne donne jamais la réponse dans les questions', () => {
          lintQuestions(m.comprehension, `M${m.number} compréhension`)
          lintQuestions(m.quiz, `M${m.number} quiz`)
        })

        for (const e of m.exercises) {
          it(`exercice ${e.id} : indices, critères et notes formateur`, async () => {
            for (const c of e.competences) expect(competenceIds, `${e.id} compétence ${c}`).toContain(c)
            if (e.type === 'validation') {
              expect(e.hints, 'la validation se fait sans aide').toHaveLength(0)
              expect(e.justifications.length).toBeGreaterThanOrEqual(2)
            } else {
              expect(e.hints.map((h) => h.level)).toEqual(['comprehension', 'demarche', 'zone', 'concept'])
              for (const h of e.hints) expect(h.text.trim().endsWith('?'), `${e.id} : indice sous forme de question`).toBe(true)
            }
            if (e.type === 'defi') expect(e.trainerNotes, `${e.id} : bugs consignés dans TRAINER.md`).not.toBeNull()
            const criteria = await loadCriteria(e.checkFile)
            expect(criteria.map((c) => c.label)).toEqual(criteriaOf(e.consigne))
            expect(new Set(criteria.map((c) => c.id)).size).toBe(criteria.length)
          })
        }

        it('ne mentionne pas les bugs des défis dans les fichiers copiés chez l\'apprenant', async () => {
          for (const e of m.exercises.filter((e) => e.type === 'defi')) {
            expect(e.consigne).not.toMatch(/bug volontaire|TRAINER/i)
            if (e.skeletonDir) {
              const { readdir } = await import('node:fs/promises')
              for (const f of await readdir(e.skeletonDir, { recursive: true, withFileTypes: true })) {
                if (!f.isFile()) continue
                const content = await readFile(`${f.parentPath}/${f.name}`, 'utf8')
                expect(content, `${e.id}/${f.name}`).not.toMatch(/\b(bug|BUG|FIXME|TODO: fix)\b/)
              }
            }
          }
        })
      })
    }
  })
}
