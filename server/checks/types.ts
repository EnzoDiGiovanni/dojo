// Contract for content/<subject>/**/check.ts files (imported there as `#check`).
//
// A criterion mirrors one line of the "Critères de réussite" section of CONSIGNE.md.
// `observed` states a measurement tied to that criterion ("taille mesurée : 412 Mo"),
// never the cause of a failure nor a way to fix it.

export interface CheckOutcome {
  ok: boolean
  observed?: string
}

export interface Criterion {
  id: string
  label: string
  run(ctx: CheckContext): Promise<CheckOutcome>
}

export interface ExecResult {
  code: number
  stdout: string
  stderr: string
}

export interface ExecOptions {
  cwd?: string
  timeoutMs?: number
}

export interface HttpResponse {
  status: number
  body: string
}

export interface BuildResult {
  ok: boolean
  output: string
}

export interface ProbeContainer {
  name: string
  hostPort: number | null
  logs(): Promise<string>
  /** `docker stop`, returning the duration in ms and the exit code. */
  stop(): Promise<{ durationMs: number; exitCode: number }>
  remove(): Promise<void>
}

export interface CheckContext {
  /** Learner's working directory for this exercise. */
  dir: string
  exec(cmd: string, args: string[], opts?: ExecOptions): Promise<ExecResult>
  docker(args: string[], opts?: ExecOptions): Promise<ExecResult>
  /** Resolves to null when nothing answers (connection refused, timeout). */
  http(url: string, opts?: { timeoutMs?: number }): Promise<HttpResponse | null>
  /** Polls until something answers or the timeout elapses. */
  waitForHttp(url: string, timeoutMs?: number): Promise<HttpResponse | null>
  /** Reads a file relative to `dir`; null if missing. */
  readFile(relative: string): Promise<string | null>
  /** Parses KEY=value lines of a file relative to `dir`; null if missing. */
  readEnvFile(relative: string): Promise<Record<string, string> | null>
  inspectContainer(name: string): Promise<any | null>
  inspectImage(ref: string): Promise<any | null>
  /** Builds a context directory with plain BuildKit output. Images are tagged under dojo-check/. */
  build(contextDir: string, opts: { tag: string; buildArgs?: Record<string, string>; dockerfile?: string }): Promise<BuildResult>
  /** Starts a throw-away container (removed by the runner afterwards). */
  runProbe(image: string, opts?: { containerPort?: number; args?: string[]; env?: Record<string, string> }): Promise<ProbeContainer>
  /** Runs a command in a fresh container from `image` and returns its output. */
  runOnce(image: string, args?: string[], opts?: { entrypoint?: string }): Promise<ExecResult>
  /** Copies `dir` to a temporary directory removed by the runner afterwards. */
  tempCopy(): Promise<string>
  /** Creates an empty temporary directory removed by the runner afterwards. */
  tempDir(): Promise<string>
}
