import { describe, it, expect, vi, afterEach } from 'vitest'
import { retry } from '../src/retry.js'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('retry', () => {
  it('resolves with the function value on first success', async () => {
    const fn = vi.fn(async () => 'ok')

    const result = await retry(fn, {
      maxAttempts: 3,
      baseDelayMs: 100,
      shouldRetry: () => true,
    })

    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('propagates the error immediately when shouldRetry returns false', async () => {
    class ValidationError extends Error {}
    const fn = vi.fn(async () => {
      throw new ValidationError('bad input')
    })

    await expect(
      retry(fn, {
        maxAttempts: 3,
        baseDelayMs: 100,
        shouldRetry: (e) => !(e instanceof ValidationError),
      })
    ).rejects.toBeInstanceOf(ValidationError)

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on rejection and resolves once fn succeeds', async () => {
    let calls = 0
    const fn = vi.fn(async () => {
      calls++
      if (calls < 3) throw new Error('flaky')
      return 'ok'
    })

    const result = await retry(fn, {
      maxAttempts: 5,
      baseDelayMs: 0,
      shouldRetry: () => true,
    })

    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('propagates the final error after exhausting maxAttempts', async () => {
    const fn = vi.fn(async () => {
      throw new Error('still failing')
    })

    await expect(
      retry(fn, {
        maxAttempts: 3,
        baseDelayMs: 0,
        shouldRetry: () => true,
      })
    ).rejects.toThrow('still failing')

    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('uses exponential backoff between retries (delay grows each attempt)', async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')

    const fn = vi.fn(async () => {
      throw new Error('boom')
    })

    const promise = retry(fn, {
      maxAttempts: 4,
      baseDelayMs: 100,
      shouldRetry: () => true,
    }).catch(() => undefined)

    await vi.runAllTimersAsync()
    await promise

    const delays = setTimeoutSpy.mock.calls.map((call) => call[1] as number)
    expect(delays).toHaveLength(3)
    expect(delays[1]).toBeGreaterThan(delays[0]!)
    expect(delays[2]).toBeGreaterThan(delays[1]!)
  })

  it('uses error.retryAfterMs as the delay when it is a finite non-negative number', async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')

    class ThrottledError extends Error {
      retryAfterMs = 250
    }

    let calls = 0
    const fn = vi.fn(async () => {
      calls++
      if (calls < 3) throw new ThrottledError('slow down')
      return 'ok'
    })

    const promise = retry(fn, {
      maxAttempts: 5,
      baseDelayMs: 100,
      shouldRetry: () => true,
    })

    await vi.runAllTimersAsync()
    const result = await promise

    expect(result).toBe('ok')
    const delays = setTimeoutSpy.mock.calls.map((call) => call[1] as number)
    expect(delays).toEqual([250, 250])
  })

  it('falls back to exponential backoff when retryAfterMs is missing or invalid', async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')

    let calls = 0
    const fn = vi.fn(async () => {
      calls++
      if (calls === 1) {
        const e = new Error('throttled') as Error & { retryAfterMs?: unknown }
        e.retryAfterMs = 500
        throw e
      }
      if (calls === 2) {
        throw new Error('plain')
      }
      if (calls === 3) {
        const e = new Error('bad') as Error & { retryAfterMs?: unknown }
        e.retryAfterMs = -10
        throw e
      }
      if (calls === 4) {
        const e = new Error('nan') as Error & { retryAfterMs?: unknown }
        e.retryAfterMs = 'soon'
        throw e
      }
      if (calls === 5) {
        const e = new Error('inf') as Error & { retryAfterMs?: unknown }
        e.retryAfterMs = Infinity
        throw e
      }
      return 'ok'
    })

    const promise = retry(fn, {
      maxAttempts: 6,
      baseDelayMs: 100,
      shouldRetry: () => true,
    })

    await vi.runAllTimersAsync()
    const result = await promise

    expect(result).toBe('ok')
    const delays = setTimeoutSpy.mock.calls.map((call) => call[1] as number)
    expect(delays[0]).toBe(500)
    expect(delays[1]).toBe(300)
    expect(delays[2]).toBe(600)
    expect(delays[3]).toBe(1200)
    expect(delays[4]).toBe(2400)
  })

  it('applies jitter so the delay varies with Math.random', async () => {
    vi.useFakeTimers()
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')

    const fn = vi.fn(async () => {
      throw new Error('boom')
    })

    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    const a = retry(fn, {
      maxAttempts: 2,
      baseDelayMs: 100,
      shouldRetry: () => true,
    }).catch(() => undefined)
    await vi.runAllTimersAsync()
    await a
    const lowJitterDelay = setTimeoutSpy.mock.calls[0]![1] as number

    setTimeoutSpy.mockClear()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const b = retry(fn, {
      maxAttempts: 2,
      baseDelayMs: 100,
      shouldRetry: () => true,
    }).catch(() => undefined)
    await vi.runAllTimersAsync()
    await b
    const highJitterDelay = setTimeoutSpy.mock.calls[0]![1] as number

    expect(highJitterDelay).toBeGreaterThan(lowJitterDelay)
  })
})
