// Renders formation/<subject>/progression.md, the file the coach-formation skill reads
// when the learner continues a session in Claude Code. It is a view of the state.
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { STEP_LABELS, type CompetenceStatus } from '../shared/api.ts'
import type { Module, Subject } from './content.ts'
import { competenceStatus, currentPosition, moduleUnlocked, stepViews, validationPassed } from './engine.ts'
import { ROOT, exerciseWorkdir, progressionFile } from './paths.ts'
import { moduleState, readState, type SubjectState } from './state.ts'

const STATUS_ICON: Record<CompetenceStatus, string> = {
  valide: '✅',
  'a-defendre': '🟠',
  fragile: '🟡',
  'en-cours': '🔄',
  'a-venir': '⏳',
}

const day = (iso: string | undefined) => (iso ? iso.slice(0, 10) : '—')
const cell = (text: string) => text.replace(/\|/g, '\\|').replace(/\n+/g, ' ')
const rel = (absolute: string) => path.relative(ROOT, absolute)

function moduleStatus(subject: Subject, s: SubjectState, m: Module): string {
  if (!m.authored) return '📝 à rédiger'
  const ms = moduleState(s, m.number)
  const statuses = m.competences.map((c) => competenceStatus(m, ms, c.id))
  if (statuses.every((st) => st === 'valide')) return '✅ validé'
  if (validationPassed(m, ms)) return '🟠 validation technique réussie, explications à défendre'
  if (statuses.some((st) => st !== 'a-venir')) return '🔄 en cours'
  return moduleUnlocked(subject, s, m.number) ? '⏳ à venir (débloqué)' : '⏳ à venir'
}

function vigilance(subject: Subject, s: SubjectState): string[] {
  const lines: string[] = []
  for (const m of subject.modules.filter((m) => m.authored)) {
    const ms = moduleState(s, m.number)
    for (const c of m.competences) {
      if (competenceStatus(m, ms, c.id) === 'fragile') lines.push(`M${m.number} — compétence fragile : ${c.text}`)
    }
    for (const [kind, questions] of [['compréhension', m.comprehension], ['quiz', m.quiz]] as const) {
      for (const q of questions) {
        const qs = (kind === 'quiz' ? ms.quiz : ms.comprehension)[q.id]
        if (qs?.firstTry === false) lines.push(`M${m.number} ${kind} « ${cell(q.prompt)} » : raté au premier essai (${qs.attempts} essais)`)
      }
    }
    for (const e of m.exercises) {
      const es = ms.exercises[e.id]
      if (!es || es.hintsRevealed === 0) continue
      const outcome = es.passedAt ? 'réussi' : 'pas encore réussi'
      lines.push(`M${m.number} exercice ${e.id} (${e.title}) : ${es.hintsRevealed}/${e.hints.length} indices, ${es.checkRuns} vérifications, ${outcome}.`)
      for (const t of es.tried) lines.push(`  - avant l'indice ${t.hintLevel}, a essayé : « ${cell(t.text)} »`)
      if (es.hintsRevealed === e.hints.length && !es.passedAt) {
        lines.push(`  - échelle d'indices épuisée : proposer un mini-exercice intermédiaire sur la notion manquante.`)
      }
    }
  }
  return lines
}

function pendingExplanations(subject: Subject, s: SubjectState): string[] {
  const blocks: string[] = []
  for (const m of subject.modules.filter((m) => m.authored)) {
    const ms = moduleState(s, m.number)
    for (const e of m.exercises.filter((e) => e.type === 'validation')) {
      const es = ms.exercises[e.id]
      if (!es?.passedAt || !es.justifications || es.explanation?.verdict === 'ok') continue
      blocks.push(`### Module ${m.number} — ${e.title} (réussie seul le ${day(es.passedAt)})`, '')
      e.justifications.forEach((q, i) => {
        blocks.push(`**${q}**`, '', ...(es.justifications![i] ?? '').split('\n').map((l) => `> ${l}`), '')
      })
      blocks.push(`Après l'échange : \`npm run dojo -- explain ${subject.id} ${m.number} ok|ko "<note>"\``, '')
    }
  }
  return blocks
}

function trainerNotes(subject: Subject, s: SubjectState): string[] {
  const blocks: string[] = []
  for (const m of subject.modules.filter((m) => m.authored)) {
    const ms = moduleState(s, m.number)
    for (const e of m.exercises) {
      if (!e.trainerNotes || !ms.exercises[e.id]?.startedAt) continue
      blocks.push(`### M${m.number} · ${e.id} — ${e.title}`, '', e.trainerNotes.replace(/^#+ .*\n/, '').trim(), '')
    }
  }
  return blocks
}

export function renderProgression(subject: Subject, s: SubjectState): string {
  const p = s.profile
  const position = currentPosition(subject, s)
  const out: string[] = [
    `# Progression — ${subject.title}`,
    '',
    '> Généré par Dojo à chaque action dans le site : ne pas éditer à la main.',
    '> Coach Claude Code : lis « Consignes pour le coach » en bas de ce fichier.',
    '',
    `**Objectif de l'apprenant :** ${p?.objective ?? '—'}`,
    `**Niveau de départ :** ${p ? `${p.selfLevel} (ressenti) — diagnostic ${p.diagnosticScore}, module de départ suggéré : ${p.suggestedModule}` : '—'}`,
    `**Rythme :** ${p?.rhythm ?? '—'}`,
    `**Démarrée le :** ${day(s.startedAt)} — **Dernière séance :** ${day(s.lastSessionAt)}`,
    '',
    '## Programme',
    '',
    '| Module | Compétences (« Je sais… ») | Statut |',
    '|---|---|---|',
  ]
  for (const m of subject.modules) {
    const ms = moduleState(s, m.number)
    const comps = m.competences
      .map((c) => `${m.authored ? STATUS_ICON[competenceStatus(m, ms, c.id)] : '⏳'} ${cell(c.text)}`)
      .join('<br>')
    out.push(`| ${m.number}. ${cell(m.title)} | ${comps} | ${moduleStatus(subject, s, m)} |`)
  }
  out.push(
    '',
    'Statuts des compétences : ✅ validée seul · 🟠 réussie seul, explication à défendre · 🟡 fragile (réussie avec aide, à revalider) · 🔄 en cours · ⏳ à venir',
    '',
    '## Où on en est',
    '',
  )
  if (position) {
    const module = subject.modules.find((m) => m.number === position.module)!
    const steps = stepViews(module, moduleState(s, module.number))
    const done = steps.filter((v) => v.done).map((v) => STEP_LABELS[v.step]).join(', ') || 'aucune'
    const exerciseId = position.href.match(/\/e\/([^/?]+)$/)?.[1]
    out.push(
      `- **Module actuel :** ${module.number} (${module.title}) — étape : ${STEP_LABELS[position.step].toLowerCase()} (étapes terminées : ${done})`,
      `- **Prochain exercice :** ${exerciseId ? `\`${rel(exerciseWorkdir(subject.id, module.number, exerciseId))}/CONSIGNE.md\` — ${position.label}` : position.label}`,
    )
  } else {
    out.push('- Diagnostic pas encore passé.')
  }
  out.push('', '## Résultats', '', '| Date | Module | Activité | Résultat |', '|---|---|---|---|')
  for (const r of s.results) out.push(`| ${day(r.date)} | ${r.module} | ${cell(r.activity)} | ${cell(r.result)} |`)
  const points = vigilance(subject, s)
  out.push('', '## Points de vigilance', '', ...(points.length ? points.map((l) => (l.startsWith('  ') ? l : `- ${l}`)) : ['- Rien à signaler pour l\'instant.']))
  const explanations = pendingExplanations(subject, s)
  out.push('', '## Explications à défendre', '', ...(explanations.length ? explanations : ['Aucune pour l\'instant.', '']))
  out.push('## Journal des séances', '')
  for (const j of s.journal) out.push(`- **${day(j.date)}**${j.source === 'coach' ? ' (coach)' : ''} — ${cell(j.text)}`)
  if (!s.journal.length) out.push('- Aucune séance terminée.')
  out.push(
    '',
    '## Notes formateur',
    '',
    '<!-- Réservé au formateur : bugs volontaires des défis, cas limites attendus. Ne jamais les révéler à l\'apprenant. -->',
    '',
    ...trainerNotes(subject, s),
    '## Consignes pour le coach',
    '',
    '- Ce fichier est régénéré par Dojo : ne l\'édite pas. Agis sur la progression depuis la racine du projet `dojo` :',
    `  - \`npm run dojo -- explain ${subject.id} <module> ok|ko "<note>"\` après avoir interrogé l'apprenant sur ses justifications (ko = la validation est à refaire).`,
    `  - \`npm run dojo -- note ${subject.id} "<texte>"\` pour ajouter une entrée au journal (ce qui a été travaillé, remédiation prévue).`,
    `- Les exercices sont dans \`${rel(path.dirname(progressionFile(subject.id)))}/module-N/exercice-X/\` ; leurs critères de réussite sont dans CONSIGNE.md et vérifiés par le site.`,
    '- Le contrat du skill coach-formation s\'applique : aucune réponse, aucune ligne de code, uniquement des questions socratiques.',
    '',
  )
  return out.join('\n')
}

export async function writeProgression(subject: Subject): Promise<void> {
  const s = (await readState()).subjects[subject.id]
  if (!s) return
  const file = progressionFile(subject.id)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, renderProgression(subject, s))
}
