// Canonical retry test suite.
// Round 2: includes round-1 tests plus section 5 (retryAfterMs).
// ../src/retry is substituted by harness/score-rubric.sh.

import { describe, it, expect } from 'vitest'
import { retry } from '../src/retry'

const noop = () => true

describe('1. core behaviour', () => {
  it('1.1 first attempt succeeds returns value', async () => {
    const r = await retry(async () => 42, { maxAttempts: 3, baseDelayMs: 5, shouldRetry: noop })
    expect(r).toBe(42)
  })

  it('1.2 first attempt succeeds calls fn exactly once', async () => {
    let calls = 0
    await retry(async () => { calls++; return 'ok' }, { maxAttempts: 5, baseDelayMs: 5, shouldRetry: noop })
    expect(calls).toBe(1)
  })

  it('1.3 retries until success', async () => {
    let calls = 0
    const r = await retry(async () => {
      calls++
      if (calls < 3) throw new Error('flaky')
      return 'ok'
    }, { maxAttempts: 5, baseDelayMs: 5, shouldRetry: noop })
    expect(r).toBe('ok')
    expect(calls).toBe(3)
  })

  it('1.4 exhausts maxAttempts and rejects with final error', async () => {
    let calls = 0
    await expect(retry(async () => {
      calls++
      throw new Error(`fail-${calls}`)
    }, { maxAttempts: 3, baseDelayMs: 5, shouldRetry: noop })).rejects.toThrow(/fail-3/)
    expect(calls).toBe(3)
  })
})

describe('2. shouldRetry gating', () => {
  it('2.1 shouldRetry false propagates immediately', async () => {
    let calls = 0
    await expect(retry(async () => {
      calls++
      throw new Error('nope')
    }, { maxAttempts: 5, baseDelayMs: 5, shouldRetry: () => false })).rejects.toThrow('nope')
    expect(calls).toBe(1)
  })

  it('2.2 shouldRetry receives the error', async () => {
    const seen: unknown[] = []
    await expect(retry(async () => { throw new Error('boom') }, {
      maxAttempts: 2,
      baseDelayMs: 5,
      shouldRetry: (e) => { seen.push(e); return true },
    })).rejects.toThrow()
    expect(seen.length).toBeGreaterThanOrEqual(1)
    expect(seen[0]).toBeInstanceOf(Error)
  })
})

describe('3. backoff', () => {
  it('3.1 delay grows across attempts', async () => {
    const ts: number[] = []
    await expect(retry(async () => {
      ts.push(Date.now())
      throw new Error('x')
    }, { maxAttempts: 3, baseDelayMs: 30, shouldRetry: noop })).rejects.toThrow()
    expect(ts.length).toBe(3)
    const d1 = ts[1] - ts[0]
    const d2 = ts[2] - ts[1]
    // Allow generous jitter slack but require strictly growing trend.
    expect(d2).toBeGreaterThan(d1 * 1.2)
  })

  it('3.2 jitter — repeated runs produce different delays', async () => {
    const runDelays: number[] = []
    for (let i = 0; i < 4; i++) {
      const ts: number[] = []
      await expect(retry(async () => {
        ts.push(Date.now())
        throw new Error('x')
      }, { maxAttempts: 2, baseDelayMs: 50, shouldRetry: noop })).rejects.toThrow()
      runDelays.push(ts[1] - ts[0])
    }
    const uniq = new Set(runDelays.map((d) => Math.round(d / 5)))
    expect(uniq.size).toBeGreaterThan(1)
  })
})

describe('4. no delay on success', () => {
  it('4.1 fast path on first-try success', async () => {
    const t0 = Date.now()
    await retry(async () => 'ok', { maxAttempts: 5, baseDelayMs: 200, shouldRetry: noop })
    expect(Date.now() - t0).toBeLessThan(50)
  })
})

describe('5. retryAfterMs round 2', () => {
  class ThrottledError extends Error {
    retryAfterMs: number
    constructor(ms: number) { super('throttled'); this.retryAfterMs = ms }
  }

  it('5.1 retryAfterMs is honoured', async () => {
    let calls = 0
    const ts: number[] = []
    const r = await retry(async () => {
      calls++
      ts.push(Date.now())
      if (calls < 3) throw new ThrottledError(120)
      return 'ok'
    }, { maxAttempts: 5, baseDelayMs: 10, shouldRetry: noop })
    expect(r).toBe('ok')
    const d1 = ts[1] - ts[0]
    const d2 = ts[2] - ts[1]
    // Both gaps should be near 120ms, not the much smaller exponential value.
    expect(d1).toBeGreaterThanOrEqual(100)
    expect(d2).toBeGreaterThanOrEqual(100)
  })

  it('5.2 retryAfterMs=0 produces near-zero delay', async () => {
    let calls = 0
    const ts: number[] = []
    await retry(async () => {
      calls++
      ts.push(Date.now())
      if (calls < 2) throw new ThrottledError(0)
      return 'ok'
    }, { maxAttempts: 3, baseDelayMs: 500, shouldRetry: noop })
    expect(ts[1] - ts[0]).toBeLessThan(100)
  })

  it('5.3 falls back to backoff when retryAfterMs missing', async () => {
    let calls = 0
    const ts: number[] = []
    await expect(retry(async () => {
      calls++
      ts.push(Date.now())
      throw new Error('plain')
    }, { maxAttempts: 3, baseDelayMs: 80, shouldRetry: noop })).rejects.toThrow()
    // Plain error → exponential. Second gap should be larger than first.
    const d1 = ts[1] - ts[0]
    const d2 = ts[2] - ts[1]
    expect(d2).toBeGreaterThan(d1 * 1.2)
  })

  it('5.4 falls back when retryAfterMs is negative', async () => {
    let calls = 0
    const ts: number[] = []
    await expect(retry(async () => {
      calls++
      ts.push(Date.now())
      const e: any = new Error('weird')
      e.retryAfterMs = -100
      throw e
    }, { maxAttempts: 2, baseDelayMs: 60, shouldRetry: noop })).rejects.toThrow()
    // Should NOT honour negative; should use backoff (~60ms), not -100ms (instant).
    expect(ts[1] - ts[0]).toBeGreaterThanOrEqual(30)
  })

  it('5.5 falls back when retryAfterMs is NaN', async () => {
    let calls = 0
    const ts: number[] = []
    await expect(retry(async () => {
      calls++
      ts.push(Date.now())
      const e: any = new Error('weird')
      e.retryAfterMs = Number.NaN
      throw e
    }, { maxAttempts: 2, baseDelayMs: 60, shouldRetry: noop })).rejects.toThrow()
    expect(ts[1] - ts[0]).toBeGreaterThanOrEqual(30)
  })

  it('5.6 mixed errors compute delay per-attempt', async () => {
    class Throttled extends Error { retryAfterMs = 150 }
    let calls = 0
    const ts: number[] = []
    await expect(retry(async () => {
      calls++
      ts.push(Date.now())
      if (calls === 1) throw new Throttled()
      throw new Error('plain')
    }, { maxAttempts: 3, baseDelayMs: 20, shouldRetry: noop })).rejects.toThrow()
    const d1 = ts[1] - ts[0]
    const d2 = ts[2] - ts[1]
    expect(d1).toBeGreaterThanOrEqual(120)
    expect(d2).toBeLessThan(d1)
  })
})
