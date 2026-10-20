import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { parse } from 'yaml'
import { z } from 'zod'
import type { ExerciseType, PublicQuestion, Step } from '../shared/api.ts'
import { HttpError } from './errors.ts'
import { contentDir } from './paths.ts'

const optionSchema = z.object({
  text: z.string().min(1),
  correct: z.boolean().default(false),
  relance: z.string().optional(),
})

const questionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  type: z.enum(['qcm', 'vrai-faux', 'prediction']),
  prompt: z.string().min(1),
  code: z.string().optional(),
  justify: z.boolean().default(false),
  options: z.array(optionSchema).min(2),
})

const questionFileSchema = z.object({ questions: z.array(questionSchema) })

const diagnosticSchema = z.object({
  questions: z.array(questionSchema.extend({ module: z.number().int().positive() })),
})

const hintSchema = z.object({
  level: z.enum(['comprehension', 'demarche', 'zone', 'concept']),
  text: z.string().min(1),
})

const exerciseSchema = z.object({
  type: z.enum(['application', 'intermediaire', 'defi', 'validation']),
  title: z.string().min(1),
  summary: z.string().min(1),
  competences: z.array(z.string()).min(1),
  hints: z.array(hintSchema).default([]),
  justifications: z.array(z.string()).default([]),
  review: z.array(z.string()).default([]),
})

const moduleSchema = z.object({
  title: z.string().min(1),
  competences: z.array(z.object({ id: z.string(), text: z.string() })).min(1),
  exercises: z.array(z.string().regex(/^[a-z0-9-]+$/)).default([]),
})

const subjectSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  modules: z.array(z.string()).min(1),
})

export type Question = z.infer<typeof questionSchema>
export type DiagnosticQuestion = z.infer<typeof diagnosticSchema>['questions'][number]

export interface Exercise extends z.infer<typeof exerciseSchema> {
  id: string
  dir: string
  consigne: string
  checkFile: string
  skeletonDir: string | null
  trainerNotes: string | null
}

export interface Module {
  number: number
  dir: string
  title: string
  competences: { id: string; text: string }[]
  authored: boolean
  cours: string | null
  comprehension: Question[]
  quiz: Question[]
  exercises: Exercise[]
}

export interface Subject {
  id: string
  title: string
  description: string
  modules: Module[]
  diagnostic: DiagnosticQuestion[]
}

const EXERCISE_STEP: Record<ExerciseType, Step> = {
  application: 'application',
  intermediaire: 'intermediaire',
  defi: 'defi',
  validation: 'validation',
}

export const exerciseStep = (type: ExerciseType): Step => EXERCISE_STEP[type]

async function readYaml<T>(file: string, schema: z.ZodType<T>): Promise<T> {
  const raw = parse(await readFile(file, 'utf8'))
  const result = schema.safeParse(raw)
  if (!result.success) throw new Error(`Invalid content in ${file}: ${z.prettifyError(result.error)}`)
  return result.data
}

async function readOptional(file: string): Promise<string | null> {
  return existsSync(file) ? readFile(file, 'utf8') : null
}

async function loadQuestions(file: string): Promise<Question[]> {
  return existsSync(file) ? (await readYaml(file, questionFileSchema)).questions : []
}

async function loadExercise(moduleDir: string, id: string): Promise<Exercise> {
  const dir = path.join(moduleDir, 'exercises', id)
  const meta = await readYaml(path.join(dir, 'exercise.yaml'), exerciseSchema)
  const skeletonDir = path.join(dir, 'skeleton')
  return {
    ...meta,
    id,
    dir,
    consigne: await readFile(path.join(dir, 'CONSIGNE.md'), 'utf8'),
    checkFile: path.join(dir, 'check.ts'),
    skeletonDir: existsSync(skeletonDir) ? skeletonDir : null,
    trainerNotes: await readOptional(path.join(dir, 'TRAINER.md')),
  }
}

async function loadModule(subjectDir: string, dirName: string, number: number): Promise<Module> {
  const dir = path.join(subjectDir, dirName)
  const meta = await readYaml(path.join(dir, 'module.yaml'), moduleSchema)
  const cours = await readOptional(path.join(dir, 'cours.md'))
  return {
    number,
    dir,
    title: meta.title,
    competences: meta.competences,
    authored: cours !== null,
    cours,
    comprehension: await loadQuestions(path.join(dir, 'comprehension.yaml')),
    quiz: await loadQuestions(path.join(dir, 'quiz.yaml')),
    exercises: await Promise.all(meta.exercises.map((id) => loadExercise(dir, id))),
  }
}

export async function listSubjectIds(): Promise<string[]> {
  const entries = await readdir(contentDir(), { withFileTypes: true })
  return entries
    .filter((e) => e.isDirectory() && existsSync(path.join(contentDir(), e.name, 'subject.yaml')))
    .map((e) => e.name)
    .sort()
}

// Content is read from disk on every call so edits show up without a restart.
export async function loadSubject(id: string): Promise<Subject> {
  if (!(await listSubjectIds()).includes(id)) throw new HttpError(404, `Sujet inconnu : ${id}`)
  const dir = path.join(contentDir(), id)
  const meta = await readYaml(path.join(dir, 'subject.yaml'), subjectSchema)
  const diagnosticFile = path.join(dir, 'diagnostic.yaml')
  return {
    id,
    title: meta.title,
    description: meta.description,
    modules: await Promise.all(meta.modules.map((m, i) => loadModule(dir, m, i + 1))),
    diagnostic: existsSync(diagnosticFile) ? (await readYaml(diagnosticFile, diagnosticSchema)).questions : [],
  }
}

export function findModule(subject: Subject, number: number): Module {
  const module = subject.modules.find((m) => m.number === number)
  if (!module || !module.authored) throw new HttpError(404, `Module ${number} indisponible`)
  return module
}

export function findExercise(module: Module, id: string): Exercise {
  const exercise = module.exercises.find((e) => e.id === id)
  if (!exercise) throw new HttpError(404, `Exercice inconnu : ${id}`)
  return exercise
}

export function toPublicQuestion(q: Question): PublicQuestion {
  return {
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    ...(q.code ? { code: q.code } : {}),
    justify: q.justify,
    options: q.options.map((o) => o.text),
  }
}
