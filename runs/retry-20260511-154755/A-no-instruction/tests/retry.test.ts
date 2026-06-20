import { describe, it, expect, vi } from 'vitest'
import { retry } from '../src/retry.js'

const noSleep = () => Promise.resolve()
const fixedRandom = () => 0.5

describe('retry', () => {
  it('returns the resolved value on first attempt success', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await retry(fn, {
      maxAttempts: 3,
      baseDelayMs: 100,
      shouldRetry: () => true,
      sleep: noSleep,
      random: fixedRandom,
    })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('does not delay before the first call', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined)
    const fn = vi.fn().mockResolvedValue('ok')
    await retry(fn, {
      maxAttempts: 3,
      baseDelayMs: 100,
      shouldRetry: () => true,
      sleep,
      random: fixedRandom,
    })
    expect(sleep).not.toHaveBeenCalled()
  })

  it('retries until success and returns the eventual value', async () => {
    let calls = 0
    const fn = vi.fn(async () => {
      calls++
      if (calls < 3) throw new Error('flaky')
      return 'ok'
    })
    const result = await retry(fn, {
      maxAttempts: 5,
      baseDelayMs: 100,
      shouldRetry: () => true,
      sleep: noSleep,
      random: fixedRandom,
    })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('propagates a non-retryable error immediately without retrying', async () => {
    class ValidationError extends Error {}
    const err = new ValidationError('bad input')
    const fn = vi.fn(async () => {
      throw err
    })
    const shouldRetry = vi.fn(
      (e: unknown) => !(e instanceof ValidationError)
    )

    await expect(
      retry(fn, {
        maxAttempts: 3,
        baseDelayMs: 100,
        shouldRetry,
        sleep: noSleep,
        random: fixedRandom,
      })
    ).rejects.toBe(err)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(shouldRetry).toHaveBeenCalledWith(err)
  })

  it('propagates the final error after exhausting all attempts', async () => {
    const err = new Error('always fails')
    const fn = vi.fn(async () => {
      throw err
    })

    await expect(
      retry(fn, {
        maxAttempts: 3,
        baseDelayMs: 100,
        shouldRetry: () => true,
        sleep: noSleep,
        random: fixedRandom,
      })
    ).rejects.toBe(err)

    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('does not sleep after the final failed attempt', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined)
    const fn = vi.fn(async () => {
      throw new Error('boom')
    })

    await expect(
      retry(fn, {
        maxAttempts: 3,
        baseDelayMs: 100,
        shouldRetry: () => true,
        sleep,
        random: fixedRandom,
      })
    ).rejects.toThrow('boom')

    expect(sleep).toHaveBeenCalledTimes(2)
  })

  it('uses exponential backoff between attempts', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined)
    const fn = vi.fn(async () => {
      throw new Error('boom')
    })

    await expect(
      retry(fn, {
        maxAttempts: 4,
        baseDelayMs: 100,
        shouldRetry: () => true,
        sleep,
        random: () => 1,
      })
    ).rejects.toThrow('boom')

    expect(sleep).toHaveBeenCalledTimes(3)
    const delays = sleep.mock.calls.map((c) => c[0] as number)
    expect(delays[0]).toBeLessThan(delays[1])
    expect(delays[1]).toBeLessThan(delays[2])
  })

  it('applies jitter so identical inputs yield different delays', async () => {
    const collect = async (random: () => number): Promise<number[]> => {
      const sleep = vi.fn().mockResolvedValue(undefined)
      const fn = vi.fn(async () => {
        throw new Error('boom')
      })
      await expect(
        retry(fn, {
          maxAttempts: 3,
          baseDelayMs: 100,
          shouldRetry: () => true,
          sleep,
          random,
        })
      ).rejects.toThrow('boom')
      return sleep.mock.calls.map((c) => c[0] as number)
    }

    const lowJitter = await collect(() => 0)
    const highJitter = await collect(() => 1)
    expect(lowJitter[0]).not.toBe(highJitter[0])
    expect(lowJitter[1]).not.toBe(highJitter[1])
  })

  it('keeps jittered delay within a bounded window of the exponential base', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined)
    const fn = vi.fn(async () => {
      throw new Error('boom')
    })

    await expect(
      retry(fn, {
        maxAttempts: 4,
        baseDelayMs: 100,
        shouldRetry: () => true,
        sleep,
        random: () => 0.25,
      })
    ).rejects.toThrow('boom')

    const delays = sleep.mock.calls.map((c) => c[0] as number)
    // For attempt n (1-based), exponential = 100 * 2^(n-1).
    // Jittered delay should stay within (0, 2 * exponential).
    expect(delays[0]).toBeGreaterThan(0)
    expect(delays[0]).toBeLessThanOrEqual(200)
    expect(delays[1]).toBeGreaterThan(0)
    expect(delays[1]).toBeLessThanOrEqual(400)
    expect(delays[2]).toBeGreaterThan(0)
    expect(delays[2]).toBeLessThanOrEqual(800)
  })

  it('uses retryAfterMs from the error instead of exponential backoff', async () => {
    class ThrottledError extends Error {
      retryAfterMs = 250
    }
    const sleep = vi.fn().mockResolvedValue(undefined)
    let calls = 0
    const fn = vi.fn(async () => {
      calls++
      if (calls < 3) throw new ThrottledError('slow down')
      return 'ok'
    })

    const result = await retry(fn, {
      maxAttempts: 5,
      baseDelayMs: 100,
      shouldRetry: () => true,
      sleep,
      random: fixedRandom,
    })

    expect(result).toBe('ok')
    const delays = sleep.mock.calls.map((c) => c[0] as number)
    expect(delays).toEqual([250, 250])
  })

  it('falls back to exponential backoff when retryAfterMs is invalid', async () => {
    const cases: unknown[] = [undefined, null, 'soon', -100, Infinity, NaN]
    for (const value of cases) {
      const sleep = vi.fn().mockResolvedValue(undefined)
      const fn = vi.fn(async () => {
        const err = new Error('boom') as Error & { retryAfterMs?: unknown }
        err.retryAfterMs = value
        throw err
      })

      await expect(
        retry(fn, {
          maxAttempts: 2,
          baseDelayMs: 100,
          shouldRetry: () => true,
          sleep,
          random: () => 1,
        })
      ).rejects.toThrow('boom')

      const delays = sleep.mock.calls.map((c) => c[0] as number)
      expect(delays).toEqual([100])
    }
  })

  it('decides per attempt whether to use retryAfterMs or backoff', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined)
    let calls = 0
    const fn = vi.fn(async () => {
      calls++
      if (calls === 1) {
        const err = new Error('throttled') as Error & { retryAfterMs?: number }
        err.retryAfterMs = 250
        throw err
      }
      if (calls === 2) {
        throw new Error('plain')
      }
      return 'ok'
    })

    const result = await retry(fn, {
      maxAttempts: 5,
      baseDelayMs: 100,
      shouldRetry: () => true,
      sleep,
      random: () => 1,
    })

    expect(result).toBe('ok')
    const delays = sleep.mock.calls.map((c) => c[0] as number)
    expect(delays[0]).toBe(250)
    expect(delays[1]).toBe(200)
  })

  it('passes the rejected error to shouldRetry', async () => {
    const err = new Error('thing')
    const shouldRetry = vi.fn().mockReturnValue(false)
    const fn = vi.fn(async () => {
      throw err
    })

    await expect(
      retry(fn, {
        maxAttempts: 3,
        baseDelayMs: 100,
        shouldRetry,
        sleep: noSleep,
        random: fixedRandom,
      })
    ).rejects.toBe(err)

    expect(shouldRetry).toHaveBeenCalledWith(err)
  })
})
