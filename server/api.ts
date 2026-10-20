import { Hono } from 'hono'
import { z } from 'zod'
import { HttpError } from './errors.ts'
import * as service from './service.ts'

const moduleNumber = (raw: string) => {
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1) throw new HttpError(400, 'Numéro de module invalide.')
  return n
}

async function body<T>(req: { json(): Promise<unknown> }, schema: z.ZodType<T>): Promise<T> {
  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) throw new HttpError(400, 'Requête invalide.')
  return parsed.data
}

const diagnosticBody = z.object({
  objective: z.string().min(1).max(2000),
  rhythm: z.string().min(1).max(200),
  selfLevel: z.string().min(1).max(200),
  answers: z.record(z.string(), z.number().int()),
})
const answerBody = z.object({ option: z.number().int().min(0), justification: z.string().max(4000).optional() })
const hintBody = z.object({ tried: z.string().max(4000) })
const justifyBody = z.object({ answers: z.array(z.string().max(8000)) })
const noteBody = z.object({ note: z.string().max(4000).default('') })

export const api = new Hono()
  .onError((err, c) => {
    if (err instanceof HttpError) return c.json({ error: err.message }, err.status)
    console.error(err)
    return c.json({ error: 'Erreur interne du serveur Dojo (voir la console).' }, 500)
  })
  .get('/subjects', async (c) => c.json(await service.listSubjects()))
  .get('/subjects/:s', async (c) => c.json(await service.overview(c.req.param('s'))))
  .get('/subjects/:s/diagnostic', async (c) => c.json(await service.diagnosticQuestions(c.req.param('s'))))
  .post('/subjects/:s/diagnostic', async (c) =>
    c.json(await service.submitDiagnostic(c.req.param('s'), await body(c.req, diagnosticBody))),
  )
  .post('/subjects/:s/session/start', async (c) => c.json(await service.startSession(c.req.param('s'))))
  .post('/subjects/:s/session/warmup', async (c) => {
    const { option } = await body(c.req, answerBody)
    return c.json(await service.answerWarmup(c.req.param('s'), option))
  })
  .post('/subjects/:s/session/end', async (c) => {
    const { note } = await body(c.req, noteBody)
    return c.json(await service.endSession(c.req.param('s'), note))
  })
  .get('/subjects/:s/modules/:n', async (c) => c.json(await service.moduleView(c.req.param('s'), moduleNumber(c.req.param('n')))))
  .post('/subjects/:s/modules/:n/test-out', async (c) => {
    await service.testOut(c.req.param('s'), moduleNumber(c.req.param('n')))
    return c.json({ ok: true })
  })
  .post('/subjects/:s/modules/:n/questions/:kind/:qid', async (c) => {
    const kind = c.req.param('kind')
    if (kind !== 'quiz' && kind !== 'comprehension') throw new HttpError(404, 'Type de question inconnu.')
    const { option, justification } = await body(c.req, answerBody)
    return c.json(
      await service.answerQuestion(c.req.param('s'), moduleNumber(c.req.param('n')), kind, c.req.param('qid'), option, justification),
    )
  })
  .get('/subjects/:s/modules/:n/exercises/:id', async (c) =>
    c.json(await service.exerciseView(c.req.param('s'), moduleNumber(c.req.param('n')), c.req.param('id'))),
  )
  .post('/subjects/:s/modules/:n/exercises/:id/start', async (c) =>
    c.json(await service.startExercise(c.req.param('s'), moduleNumber(c.req.param('n')), c.req.param('id'))),
  )
  .post('/subjects/:s/modules/:n/exercises/:id/check', async (c) =>
    c.json(await service.checkExercise(c.req.param('s'), moduleNumber(c.req.param('n')), c.req.param('id'))),
  )
  .post('/subjects/:s/modules/:n/exercises/:id/hint', async (c) => {
    const { tried } = await body(c.req, hintBody)
    await service.revealHint(c.req.param('s'), moduleNumber(c.req.param('n')), c.req.param('id'), tried)
    return c.json({ ok: true })
  })
  .post('/subjects/:s/modules/:n/exercises/:id/justify', async (c) => {
    const { answers } = await body(c.req, justifyBody)
    await service.submitJustifications(c.req.param('s'), moduleNumber(c.req.param('n')), c.req.param('id'), answers)
    return c.json({ ok: true })
  })
