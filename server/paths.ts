import path from 'node:path'

export const ROOT = path.resolve(import.meta.dirname, '..')

// Environment overrides let tests run against isolated directories.
export const contentDir = () => process.env.DOJO_CONTENT_DIR ?? path.join(ROOT, 'content')
export const dataFile = () => path.join(process.env.DOJO_DATA_DIR ?? path.join(ROOT, 'data'), 'state.json')
export const formationDir = () => process.env.DOJO_FORMATION_DIR ?? path.join(ROOT, 'formation')

export const exerciseWorkdir = (subject: string, module: number, exercise: string) =>
  path.join(formationDir(), subject, `module-${module}`, `exercice-${exercise}`)

export const progressionFile = (subject: string) => path.join(formationDir(), subject, 'progression.md')
