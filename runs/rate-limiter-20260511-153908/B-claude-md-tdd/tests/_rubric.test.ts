// Canonical rate-limiter test suite — runs against every implementation.
// Round 2 file: includes round-1 tests (sections 1-6) plus section 7 (reset).
// Score: 1 per pass; mode-parametrised tests count once per mode.
// 6.1 is informational only — written to RUBRIC_INFO_PATH, not counted.
//
// The import path is templated by score-rubric.sh — ../src/rate-limiter is replaced
// with the impl's actual relative path before this file is copied into tests/.

import { describe, it, expect } from 'vitest'
import * as fs from 'node:fs'
import { RateLimiter } from '../src/rate-limiter'

const MODES = ['fixed', 'sliding'] as const
type Mode = (typeof MODES)[number]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe.each(MODES)('mode=%s', (mode: Mode) => {
  // ---- 1. Core behaviour
  it('1.1 first call returns true', () => {
    const rl = new RateLimiter({ max: 5, windowMs: 100, mode })
    expect(rl.allow('user-1')).toBe(true)
  })

  it('1.2 allow up to max', () => {
    const rl = new RateLimiter({ max: 3, windowMs: 100, mode })
    expect([rl.allow('user-1'), rl.allow('user-1'), rl.allow('user-1')]).toEqual([true, true, true])
  })

  it('1.3 deny beyond max', () => {
    const rl = new RateLimiter({ max: 3, windowMs: 100, mode })
    rl.allow('user-1'); rl.allow('user-1'); rl.allow('user-1')
    expect(rl.allow('user-1')).toBe(false)
  })

  it('1.4 independent keys', () => {
    const rl = new RateLimiter({ max: 2, windowMs: 100, mode })
    expect([rl.allow('a'), rl.allow('a'), rl.allow('a'), rl.allow('b')]).toEqual([true, true, false, true])
  })

  // ---- 2. Boundary configuration
  it('2.1 zero allowance', () => {
    const rl = new RateLimiter({ max: 0, windowMs: 100, mode })
    expect(rl.allow('user-1')).toBe(false)
  })

  it('2.2 max=1', () => {
    const rl = new RateLimiter({ max: 1, windowMs: 100, mode })
    expect([rl.allow('user-1'), rl.allow('user-1')]).toEqual([true, false])
  })

  // ---- 5. Edge inputs
  it('5.1 empty string key', () => {
    const rl = new RateLimiter({ max: 2, windowMs: 100, mode })
    expect([rl.allow(''), rl.allow(''), rl.allow('')]).toEqual([true, true, false])
  })

  it('5.2 long key', () => {
    const rl = new RateLimiter({ max: 2, windowMs: 100, mode })
    const k = 'x'.repeat(1000)
    expect([rl.allow(k), rl.allow(k), rl.allow(k)]).toEqual([true, true, false])
  })

  it('5.3 many keys', () => {
    const rl = new RateLimiter({ max: 1, windowMs: 100, mode })
    const results = Array.from({ length: 1000 }, (_, i) => rl.allow(`k${i}`))
    expect(results.every((r) => r === true)).toBe(true)
  })

  // ---- 7. Round 2 — reset
  it('7.1 reset(key) clears state for that key', () => {
    const rl = new RateLimiter({ max: 1, windowMs: 100, mode })
    expect(rl.allow('a')).toBe(true)
    expect(rl.allow('a')).toBe(false)
    rl.reset('a')
    expect(rl.allow('a')).toBe(true)
  })

  it("7.2 reset(key) doesn't affect other keys", () => {
    const rl = new RateLimiter({ max: 1, windowMs: 100, mode })
    expect(rl.allow('a')).toBe(true)
    expect(rl.allow('b')).toBe(true)
    expect(rl.allow('a')).toBe(false)
    expect(rl.allow('b')).toBe(false)
    rl.reset('a')
    expect(rl.allow('a')).toBe(true)
    expect(rl.allow('b')).toBe(false)
  })
})

// ---- 3. Mode-specific
describe('mode-specific', () => {
  it('3.1 sliding — aged requests free up capacity', async () => {
    const rl = new RateLimiter({ max: 2, windowMs: 100, mode: 'sliding' })
    expect(rl.allow('a')).toBe(true)
    expect(rl.allow('a')).toBe(true)
    expect(rl.allow('a')).toBe(false)
    await sleep(130)
    expect(rl.allow('a')).toBe(true)
  })

  it('3.2 fixed — full capacity restored at boundary', async () => {
    const rl = new RateLimiter({ max: 2, windowMs: 100, mode: 'fixed' })
    expect([rl.allow('a'), rl.allow('a'), rl.allow('a')]).toEqual([true, true, false])
    await sleep(130)
    expect([rl.allow('a'), rl.allow('a'), rl.allow('a')]).toEqual([true, true, false])
  })

  it('3.3 modes produce different deny patterns under sustained load', async () => {
    const fixed = new RateLimiter({ max: 2, windowMs: 100, mode: 'fixed' })
    const sliding = new RateLimiter({ max: 2, windowMs: 100, mode: 'sliding' })
    const fPattern: boolean[] = []
    const sPattern: boolean[] = []
    fPattern.push(fixed.allow('a')); sPattern.push(sliding.allow('a'))
    await sleep(50)
    fPattern.push(fixed.allow('a')); sPattern.push(sliding.allow('a'))
    await sleep(50)
    fPattern.push(fixed.allow('a')); sPattern.push(sliding.allow('a'))
    await sleep(20)
    fPattern.push(fixed.allow('a')); sPattern.push(sliding.allow('a'))
    expect(JSON.stringify(fPattern)).not.toBe(JSON.stringify(sPattern))
  })

  // ---- 4. Capacity restoration
  it('4.1 progressive restoration (sliding)', async () => {
    const rl = new RateLimiter({ max: 3, windowMs: 100, mode: 'sliding' })
    expect([rl.allow('a'), rl.allow('a'), rl.allow('a')]).toEqual([true, true, true])
    await sleep(50)
    expect(rl.allow('a')).toBe(false)
    await sleep(80)
    expect(rl.allow('a')).toBe(true)
  })
})

// ---- 6. Boundary timing (informational)
describe('informational', () => {
  it('6.1 boundary behaviour (recorded, not scored)', async () => {
    const results: boolean[] = []
    for (let i = 0; i < 4; i++) {
      const rl = new RateLimiter({ max: 2, windowMs: 100, mode: 'fixed' })
      rl.allow('a')
      await sleep(50)
      rl.allow('a')
      await sleep(50)
      results.push(rl.allow('a'))
    }
    const consistent = results.every((r) => r === results[0])
    const infoPath = process.env.RUBRIC_INFO_PATH
    if (infoPath) {
      fs.writeFileSync(infoPath, JSON.stringify({ boundary: results, consistent }, null, 2))
    }
    expect(results.length).toBe(4)
  })
})
