import { describe, expect, it } from 'vitest'
import { buildSteps, formatBytes } from './buildkit.ts'

const OUTPUT = `#1 [internal] load build definition from Dockerfile
#1 transferring dockerfile: 162B done
#4 [1/5] FROM docker.io/library/node:22-alpine@sha256:abc
#5 [internal] load build context
#5 transferring context: 301B done
#6 [2/5] WORKDIR /app
#6 CACHED
#7 [3/5] COPY package.json package-lock.json ./
#7 CACHED
#8 [4/5] RUN npm ci --omit=dev
#8 CACHED
#9 [5/5] COPY . .
#9 DONE 0.0s`

describe('buildSteps', () => {
  it('reads instructions and their cache status, ignoring internal steps', () => {
    expect(buildSteps(OUTPUT).map((s) => [s.instruction, s.cached])).toEqual([
      ['FROM docker.io/library/node:22-alpine@sha256:abc', false],
      ['WORKDIR /app', true],
      ['COPY package.json package-lock.json ./', true],
      ['RUN npm ci --omit=dev', true],
      ['COPY . .', false],
    ])
  })
})

describe('formatBytes', () => {
  it('uses French units', () => {
    expect(formatBytes(512)).toBe('512 o')
    expect(formatBytes(28_900)).toBe('28.9 ko')
    expect(formatBytes(2_100_000)).toBe('2.1 Mo')
  })
})
