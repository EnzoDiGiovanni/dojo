// Helpers reading `docker build --progress=plain` output.

export interface BuildStep {
  id: string
  instruction: string
  cached: boolean
}

export function buildSteps(output: string): BuildStep[] {
  const steps = new Map<string, BuildStep>()
  for (const line of output.split(/\r?\n/)) {
    const header = line.match(/^#(\d+) \[(?!internal\])[^\]]*\] (.+)$/)
    if (header) {
      steps.set(header[1], { id: header[1], instruction: header[2].trim(), cached: false })
      continue
    }
    const cached = line.match(/^#(\d+) CACHED\s*$/)
    if (cached && steps.has(cached[1])) steps.get(cached[1])!.cached = true
  }
  return [...steps.values()]
}

export function formatBytes(bytes: number): string {
  if (bytes < 1e3) return `${bytes} o`
  if (bytes < 1e6) return `${(bytes / 1e3).toFixed(1)} ko`
  return `${(bytes / 1e6).toFixed(1)} Mo`
}
