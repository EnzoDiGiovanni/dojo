# CLAUDE.md

Dojo: local training platform applying the `coach-formation` skill contract. Vite + React + TS front,
Hono server on 127.0.0.1 that runs real `docker` commands to verify the learner's work.

## The contract (non-negotiable)

- Never give an answer: no solution files, no fixed code, no hint that is the answer in disguise.
  Hints and quiz follow-ups are **questions**, ordered comprehension → démarche → zone → concept.
- The correct option of a question never leaves the server (`toPublicQuestion`, `evaluateAnswer`).
- A check reports, per criterion, a factual observation ("taille mesurée : 412 Mo"), never the cause.
- Validation exercises have no hints; competences become ✅ only after the coach (Claude Code)
  hears the learner defend their choices and runs `npm run dojo -- explain <sujet> <module> ok|ko`.
- Never modify files under `formation/`: it is the learner's workspace. `formation/<sujet>/progression.md`
  is generated from `data/state.json`; act on it through the CLI, not by editing it.

## Layout

- `content/<sujet>/`: `subject.yaml`, `diagnostic.yaml`, one folder per module (`module.yaml`, `cours.md`,
  `comprehension.yaml`, `quiz.yaml`, `exercises/<id>/{exercise.yaml,CONSIGNE.md,check.ts,skeleton/,TRAINER.md}`).
  A module without `cours.md` is listed as "en préparation".
- `server/engine.ts`: pure rules (gating, competence statuses, hint unlocking). `server/service.ts`: use cases.
  `server/progression.ts`: progression.md rendering. `server/checks/`: check runner and its context.
- `content/docker/helpers.ts`: shared Docker check helpers (builds, probes, cache, image content).

## Writing content

- Load the `coach-formation` skill (shipped in `.claude/skills/coach-formation/`) before writing or extending
  a subject, module, course, quiz or exercise: its progression and exercise types are the reference.
- Course examples must differ from exercise material (module 2: PHP in the course, Node/Python in exercises).
- Each `check.ts` criterion label must match a bullet of "## Critères de réussite" in CONSIGNE.md, verbatim.
- Exercises name their resources (`dojo-m<N>-<id>`, images `dojo/m<N>-<id>:1.0`) and use host ports 47NXX.
- Bugs of a défi are described only in its `TRAINER.md`, never in the skeleton or the brief.
- Validate every new `check.ts` both ways (red without a solution, green with a throw-away solution kept
  outside the repository). `server/content.test.ts` lints the mechanical rules.

## Commands

`npm run dev` (web on :5173, API on :4317), `npm test`, `npm run typecheck`, `npm run build`, `npm start`.
