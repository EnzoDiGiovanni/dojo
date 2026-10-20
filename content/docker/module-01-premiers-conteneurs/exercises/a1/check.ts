import type { Criterion } from '#check'
import { containerRunning, httpAnswers } from '../../../helpers.ts'

export default [
  {
    id: 'running',
    label: 'Un conteneur nommé `dojo-m1-a1`, créé depuis l\'image `nginx:alpine`, est en cours d\'exécution',
    run: (ctx) => containerRunning(ctx, 'dojo-m1-a1', 'nginx:alpine'),
  },
  {
    id: 'http',
    label: 'http://127.0.0.1:47101 répond avec un code 200',
    run: (ctx) => httpAnswers(ctx, 'http://127.0.0.1:47101'),
  },
] satisfies Criterion[]
